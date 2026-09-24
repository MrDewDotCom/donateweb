import { Injectable, Logger } from '@nestjs/common';
import { TimerState } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TimerGateway } from './timer.gateway';

const TIMER_ID = 1;
// กันไม่ให้ตั้งเวลาเกินจริง (เช่นโดเนทยอดมหาศาล) — 7 วัน
const MAX_SECONDS = 7 * 24 * 60 * 60;

// สิ่งที่ส่งให้หน้า overlay: ส่ง serverNow ไปด้วย
// ให้ client ชดเชยนาฬิกาเครื่องตัวเองที่อาจเดินไม่ตรงกับ server
export interface TimerSnapshot {
    isRunning: boolean;
    remainingSec: number;
    endsAt: string | null;
    serverNow: string;
}

// คำนวณวินาทีที่ได้จากยอดโดเนท ตามเรท "rateAmount บาท = rateMinutes นาที"
// ปัดลง (ให้ผู้บริจาคได้ไม่เกินที่จ่าย)
export function secondsForAmount(amount: number, rateAmount: number, rateMinutes: number): number {
    if (rateAmount <= 0 || rateMinutes <= 0) return 0;
    return Math.floor((amount * rateMinutes * 60) / rateAmount);
}

@Injectable()
export class TimerService {
    private readonly logger = new Logger(TimerService.name);

    // ทุกการแก้ไขเวลาต้องทำทีละอัน (อ่าน → คำนวณ → เขียน)
    // ถ้ามีโดเนท 2 อันเข้ามาพร้อมกัน จะได้ไม่ทับเวลาของกันและกัน
    private queue: Promise<unknown> = Promise.resolve();

    constructor(
        private prisma: PrismaService,
        private gateway: TimerGateway,
    ) { }

    private exclusive<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.queue.then(fn, fn);
        this.queue = run.catch(() => undefined);
        return run;
    }

    private async load(): Promise<TimerState> {
        return this.prisma.timerState.upsert({
            where: { id: TIMER_ID },
            update: {},
            create: { id: TIMER_ID },
        });
    }

    // เวลาที่เหลือจริง ณ ตอนนี้ (วินาที)
    private remainingOf(state: TimerState, now = Date.now()): number {
        if (state.isRunning && state.endsAt) {
            return Math.max(0, Math.ceil((state.endsAt.getTime() - now) / 1000));
        }
        return Math.max(0, state.remainingSec);
    }

    private toSnapshot(state: TimerState): TimerSnapshot {
        const now = Date.now();
        const remainingSec = this.remainingOf(state, now);
        const isRunning = state.isRunning && remainingSec > 0;

        return {
            isRunning,
            remainingSec,
            endsAt: isRunning && state.endsAt ? state.endsAt.toISOString() : null,
            serverNow: new Date(now).toISOString(),
        };
    }

    private async save(data: { isRunning: boolean; endsAt: Date | null; remainingSec: number }) {
        const state = await this.prisma.timerState.update({
            where: { id: TIMER_ID },
            data,
        });
        const snapshot = this.toSnapshot(state);
        this.gateway.emitTimerUpdated(snapshot);
        return snapshot;
    }

    async getSnapshot(): Promise<TimerSnapshot> {
        return this.toSnapshot(await this.load());
    }

    // เพิ่มเวลา (หรือลด ถ้า seconds ติดลบ)
    // autoStart: ถ้าตัวจับเวลาหยุดอยู่/หมดแล้ว ให้เริ่มเดินทันที (ใช้กับโดเนทจับเวลา)
    addTime(seconds: number, autoStart: boolean): Promise<TimerSnapshot> {
        return this.exclusive(async () => {
            const state = await this.load();
            const now = Date.now();
            const current = this.remainingOf(state, now);
            const next = Math.min(MAX_SECONDS, Math.max(0, current + Math.trunc(seconds)));
            const run = next > 0 && (autoStart || (state.isRunning && current > 0));

            return this.save({
                isRunning: run,
                endsAt: run ? new Date(now + next * 1000) : null,
                remainingSec: run ? 0 : next,
            });
        });
    }

    pause(): Promise<TimerSnapshot> {
        return this.exclusive(async () => {
            const state = await this.load();
            return this.save({
                isRunning: false,
                endsAt: null,
                remainingSec: this.remainingOf(state),
            });
        });
    }

    resume(): Promise<TimerSnapshot> {
        return this.exclusive(async () => {
            const state = await this.load();
            const remaining = this.remainingOf(state);
            if (remaining <= 0) return this.toSnapshot(state);

            return this.save({
                isRunning: true,
                endsAt: new Date(Date.now() + remaining * 1000),
                remainingSec: 0,
            });
        });
    }

    reset(): Promise<TimerSnapshot> {
        return this.exclusive(async () => {
            await this.load();
            return this.save({ isRunning: false, endsAt: null, remainingSec: 0 });
        });
    }

    // เรียกหลังโดเนทจับเวลาจ่ายเงินแล้ว — ไม่ throw ออกไป (ไม่ให้กระทบการยืนยันโดเนท)
    async addFromDonation(donationId: number, seconds: number): Promise<void> {
        if (seconds <= 0) return;
        try {
            const snap = await this.addTime(seconds, true);
            this.logger.log(
                `Timer +${seconds}s from donation ${donationId} — now ${snap.remainingSec}s left`,
            );
        } catch (error) {
            this.logger.error(`Failed to add timer for donation ${donationId}`, error as Error);
        }
    }
}
