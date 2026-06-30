import { Controller, Delete, Param, BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

const TTS_DIR = path.join(process.cwd(), 'tts-audio');

@Controller('tts')
export class TtsController {
    private readonly logger = new Logger(TtsController.name);

    // เรียกจาก frontend หลังเล่นไฟล์เสียงจบ (onended/onerror) เพื่อลบไฟล์ทิ้งทันที
    // ไม่ throw ถ้าลบไม่ได้ เพราะไม่ใช่ critical path — แค่ log ไว้ ให้ cron fallback เก็บกวาดทีหลัง
    @Delete(':filename')
    deleteTtsFile(@Param('filename') filename: string): { deleted: boolean } {
        // กัน path traversal เช่น ../../something
        if (!/^[\w.\-]+\.mp3$/.test(filename)) {
            throw new BadRequestException('Invalid filename');
        }

        const filePath = path.join(TTS_DIR, filename);

        // เช็คว่ายังอยู่ใน TTS_DIR จริง (กัน path traversal อีกชั้น)
        if (!filePath.startsWith(TTS_DIR)) {
            throw new BadRequestException('Invalid filename');
        }

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return { deleted: true };
            }
            return { deleted: false };
        } catch (error) {
            this.logger.error(`Failed to delete TTS file ${filename}`, error as Error);
            return { deleted: false };
        }
    }
}