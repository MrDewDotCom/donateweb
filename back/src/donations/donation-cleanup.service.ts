import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/src/prisma.service';

@Injectable()
export class DonationCleanupService {
    private readonly logger = new Logger(DonationCleanupService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ทุก 5 นาที: donation ที่ status ยัง 'pending' แต่ expiresAt ผ่านไปแล้ว
    // → เปลี่ยนเป็น 'failed' (เก็บไว้เป็นหลักฐาน ไม่ลบทันที)
    @Cron(CronExpression.EVERY_5_MINUTES)
    async markExpiredAsFailed() {
        const result = await this.prisma.donation.updateMany({
            where: {
                status: 'pending',
                expiresAt: { lt: new Date() },
            },
            data: {
                status: 'failed',
            },
        });

        if (result.count > 0) {
            this.logger.log(`Marked ${result.count} expired donation(s) as failed`);
        }
    }

    // ทุก 5 นาที: donation ที่ status เป็น 'failed' มาเกิน 1 ชม. แล้ว → ลบออกจาก DB จริง
    // ใช้ expiresAt เป็นตัวอ้างอิงเวลา (เพราะ donation จะ fail ทันทีหลัง expire)
    @Cron(CronExpression.EVERY_5_MINUTES)
    async deleteOldFailedDonations() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const result = await this.prisma.donation.deleteMany({
            where: {
                status: 'failed',
                expiresAt: { lt: oneHourAgo },
            },
        });

        if (result.count > 0) {
            this.logger.log(`Deleted ${result.count} old failed donation(s)`);
        }
    }
}