import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

const TTS_VOICE = 'th-TH-PremwadeeNeural';
const TTS_DIR = path.join(process.cwd(), 'tts-audio');
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'generate_tts.py');
const PYTHON_BIN = process.env.PYTHON_BIN ?? (process.platform === 'win32' ? 'py' : 'python3');

// ไฟล์เสียงที่เก่ากว่านี้จะถูกลบทิ้งอัตโนมัติ (กันไม่ให้โฟลเดอร์โตเรื่อยๆ)
const TTS_FILE_MAX_AGE_MS = 10 * 60 * 1000; // 10 นาที

// Edge TTS ต้องยิงไปที่ server ของ Microsoft — ถ้าช้าหรือล่ม process จะค้างได้ไม่จำกัด
// จึงต้องมี timeout เสมอ ไม่งั้น promise จะไม่ settle และ request ที่รออยู่จะค้างตาม
//
// ตั้งไว้ 20 วิ เพราะวัดจริงแล้วรอบปกติใช้เวลาราว 6-7 วินาที (Python cold start + เรียก network)
// ตั้งสั้นกว่านี้จะไปฆ่างานที่กำลังจะสำเร็จอยู่แล้ว
// เป้าหมายของ timeout คือกัน "ค้างไม่มีที่สิ้นสุด" ไม่ใช่บีบให้เร็ว
const TTS_TIMEOUT_MS = 20000;
const TTS_MAX_BUFFER = 1024 * 1024; // 1MB — script ปกติไม่ print อะไรเลย

// จำนวน process ที่ generate พร้อมกันได้สูงสุด
// ถ้าโดเนทเข้ามารัวๆ เราเลือก "ข้าม TTS" ดีกว่าปล่อยให้ process กองกันจนเครื่องตาย
const TTS_MAX_CONCURRENT = 3;

@Injectable()
export class TtsService {
    private readonly logger = new Logger(TtsService.name);
    private activeJobs = 0;

    constructor() {
        if (!fs.existsSync(TTS_DIR)) {
            fs.mkdirSync(TTS_DIR, { recursive: true });
        }
    }

    // ลบไฟล์ mp3 ที่เก่ากว่า TTS_FILE_MAX_AGE_MS ทุก 5 นาที
    @Cron(CronExpression.EVERY_5_MINUTES)
    cleanupOldTtsFiles(): void {
        let files: string[];
        try {
            files = fs.readdirSync(TTS_DIR);
        } catch (error) {
            this.logger.error('Failed to read TTS dir for cleanup', error as Error);
            return;
        }

        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.mp3')) continue;

            const filePath = path.join(TTS_DIR, file);
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > TTS_FILE_MAX_AGE_MS) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            } catch (error) {
                this.logger.error(`Failed to clean up TTS file ${file}`, error as Error);
            }
        }

        if (deletedCount > 0) {
            this.logger.log(`Cleaned up ${deletedCount} expired TTS audio file(s)`);
        }
    }

    // สร้างไฟล์เสียงด้วย Edge TTS แล้วคืน URL path (เช่น /tts/xxxx.mp3)
    // คืน null ถ้าสร้างไม่สำเร็จ — ฝั่ง caller ต้อง handle กรณีนี้ (ไม่ throw เพื่อไม่ให้ donation flow พังเพราะ TTS ล่ม)
    //
    // ข้อควรระวัง: method นี้ต้องไม่ถูก await อยู่ใน critical path ของการยืนยันการชำระเงิน
    // เพราะถึงจะมี timeout แล้ว ก็ยังหน่วง response ของผู้บริจาคได้ถึง TTS_TIMEOUT_MS
    async generate(text: string): Promise<string | null> {
        if (this.activeJobs >= TTS_MAX_CONCURRENT) {
            this.logger.warn(
                `TTS skipped: ${this.activeJobs} jobs already running (max ${TTS_MAX_CONCURRENT})`,
            );
            return null;
        }

        const filename = `${Date.now()}-${randomUUID()}.mp3`;
        const outputPath = path.join(TTS_DIR, filename);

        this.activeJobs++;

        try {
            await execFileAsync(
                PYTHON_BIN,
                [
                    SCRIPT_PATH,
                    '--text',
                    text,
                    '--voice',
                    TTS_VOICE,
                    '--output',
                    outputPath,
                ],
                {
                    timeout: TTS_TIMEOUT_MS,
                    maxBuffer: TTS_MAX_BUFFER,
                    killSignal: 'SIGKILL',
                },
            );

            return `/tts/${filename}`;
        } catch (error) {
            this.logger.error('Failed to generate TTS audio', error as Error);

            // timeout แล้วโดน kill อาจเหลือไฟล์เปล่าค้างไว้ — เก็บกวาดทันที ไม่ต้องรอ cron
            fs.unlink(outputPath, () => { });

            return null;
        } finally {
            this.activeJobs--;
        }
    }
}