import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Donation } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VideoGateway } from './video.gateway';
import { censorMessage } from 'src/common/utils/censor.util';

// คลิปที่กำลังเล่น/รอเล่น — ส่งให้ overlay และหน้าแอดมิน
export interface VideoItem {
    donationId: number;
    name: string;
    amount: number;
    message: string | null;
    videoId: string;
    title: string | null;
    start: number;
    seconds: number;
}

export interface VideoSnapshot {
    current: (VideoItem & { startsAt: string; endsAt: string }) | null;
    queue: VideoItem[];
    serverNow: string;
}

// คำนวณวินาทีจากยอดโดเนท ตามเรท "rateAmount บาท = rateSeconds วินาที" ปัดลง แล้วจำกัดไม่เกิน maxSeconds
export function videoSecondsForAmount(
    amount: number,
    rateAmount: number,
    rateSeconds: number,
    maxSeconds: number,
): number {
    if (rateAmount <= 0 || rateSeconds <= 0) return 0;
    const raw = Math.floor((amount * rateSeconds) / rateAmount);
    return maxSeconds > 0 ? Math.min(raw, maxSeconds) : raw;
}

function toItem(d: Donation): VideoItem {
    return {
        donationId: d.id,
        name: d.name,
        amount: d.amount,
        // ข้อมูลนี้เป็น public (overlay) — ใช้ข้อความที่เซนเซอร์แล้ว
        message: censorMessage(d.message),
        videoId: d.videoId ?? '',
        title: d.videoTitle,
        start: d.videoStart ?? 0,
        seconds: d.videoSeconds ?? 0,
    };
}

/**
 * คิวคลิปวิดีโอ — server เป็นคนคุมจังหวะเล่นทั้งหมด
 * overlay แค่แสดงตาม snapshot (ไม่มี endpoint สาธารณะให้ใครสั่งข้ามคลิปได้)
 *
 * สถานะใน DB: queued → playing → played / skipped
 * ตอนเล่น เก็บ videoStartsAt ไว้ → server รีสตาร์ทกลางคลิปก็เล่นต่อจากจุดเดิมได้
 */
@Injectable()
export class VideoService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VideoService.name);
    private endTimer: ReturnType<typeof setTimeout> | null = null;
    // ทำทีละคำสั่ง กันเริ่มคลิปซ้อนกันตอนมีโดเนทเข้าพร้อมกัน
    private queueLock: Promise<unknown> = Promise.resolve();

    constructor(
        private prisma: PrismaService,
        private gateway: VideoGateway,
    ) { }

    async onModuleInit() {
        // กู้สถานะหลังรีสตาร์ท: คลิปที่ค้างสถานะ playing
        await this.exclusive(async () => {
            const playing = await this.prisma.donation.findFirst({ where: { videoStatus: 'playing' } });
            if (playing) {
                const end = this.endOf(playing);
                if (end && end.getTime() > Date.now()) {
                    this.scheduleEnd(playing.id, end);
                    return;
                }
                await this.prisma.donation.update({ where: { id: playing.id }, data: { videoStatus: 'played' } });
            }
            await this.startNextLocked();
        });
    }

    onModuleDestroy() {
        if (this.endTimer) clearTimeout(this.endTimer);
    }

    private exclusive<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.queueLock.then(fn, fn);
        this.queueLock = run.catch(() => undefined);
        return run;
    }

    private endOf(d: Donation): Date | null {
        if (!d.videoStartsAt || !d.videoSeconds) return null;
        return new Date(d.videoStartsAt.getTime() + d.videoSeconds * 1000);
    }

    private scheduleEnd(donationId: number, end: Date) {
        if (this.endTimer) clearTimeout(this.endTimer);
        const ms = Math.max(0, end.getTime() - Date.now());
        this.endTimer = setTimeout(() => {
            void this.finish(donationId, 'played');
        }, ms);
    }

    // เริ่มคลิปถัดไปถ้าตอนนี้ว่าง (ต้องเรียกภายใน exclusive)
    private async startNextLocked(): Promise<void> {
        const playing = await this.prisma.donation.findFirst({ where: { videoStatus: 'playing' } });
        if (!playing) {
            const next = await this.prisma.donation.findFirst({
                where: { videoStatus: 'queued', status: 'paid' },
                orderBy: { paidAt: 'asc' },
            });

            if (next) {
                // มี alert ก่อน → รอให้ alert/TTS จบ, เล่นคลิปอย่างเดียว → เริ่มทันที
                const settings = await this.prisma.setting.findFirst();
                const delaySec = next.videoAlert === false ? 0 : Math.max(0, settings?.videoStartDelay ?? 6);
                const startsAt = new Date(Date.now() + delaySec * 1000);

                const started = await this.prisma.donation.update({
                    where: { id: next.id },
                    data: { videoStatus: 'playing', videoStartsAt: startsAt },
                });
                const end = this.endOf(started);
                if (end) this.scheduleEnd(started.id, end);
                this.logger.log(`Video ${started.videoId} (donation ${started.id}) starts in ${delaySec}s`);
            }
        }

        await this.broadcast();
    }

    private async finish(donationId: number, status: 'played' | 'skipped') {
        await this.exclusive(async () => {
            await this.prisma.donation.updateMany({
                where: { id: donationId, videoStatus: 'playing' },
                data: { videoStatus: status },
            });
            await this.startNextLocked();
        });
    }

    async getSnapshot(): Promise<VideoSnapshot> {
        const [playing, queued] = await Promise.all([
            this.prisma.donation.findFirst({ where: { videoStatus: 'playing' } }),
            this.prisma.donation.findMany({
                where: { videoStatus: 'queued', status: 'paid' },
                orderBy: { paidAt: 'asc' },
                take: 50,
            }),
        ]);

        const end = playing ? this.endOf(playing) : null;
        return {
            current:
                playing && playing.videoStartsAt && end
                    ? { ...toItem(playing), startsAt: playing.videoStartsAt.toISOString(), endsAt: end.toISOString() }
                    : null,
            queue: queued.map(toItem),
            serverNow: new Date().toISOString(),
        };
    }

    private async broadcast() {
        try {
            this.gateway.emitVideoUpdated(await this.getSnapshot());
        } catch (error) {
            this.logger.error('Failed to broadcast video state', error as Error);
        }
    }

    // เรียกหลังโดเนทคลิปจ่ายเงินแล้ว — ไม่ throw ออกไป
    async enqueue(donationId: number): Promise<void> {
        try {
            await this.exclusive(async () => {
                await this.prisma.donation.updateMany({
                    where: { id: donationId, videoStatus: null, type: 'video' },
                    data: { videoStatus: 'queued' },
                });
                await this.startNextLocked();
            });
        } catch (error) {
            this.logger.error(`Failed to queue video for donation ${donationId}`, error as Error);
        }
    }

    // แอดมิน: ข้ามคลิปที่กำลังเล่น
    async skipCurrent(): Promise<VideoSnapshot> {
        const playing = await this.prisma.donation.findFirst({ where: { videoStatus: 'playing' } });
        if (playing) {
            if (this.endTimer) clearTimeout(this.endTimer);
            await this.finish(playing.id, 'skipped');
        }
        return this.getSnapshot();
    }

    // แอดมิน: เอาคลิปออกจากคิว (ยังไม่เล่น)
    async removeQueued(donationId: number): Promise<VideoSnapshot> {
        await this.exclusive(async () => {
            const res = await this.prisma.donation.updateMany({
                where: { id: donationId, videoStatus: 'queued' },
                data: { videoStatus: 'skipped' },
            });
            if (res.count === 0) throw new NotFoundException('ไม่พบคลิปนี้ในคิว');
            await this.broadcast();
        });
        return this.getSnapshot();
    }
}
