import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

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
    //
    // ห้ามลบรายการที่มี transRef เด็ดขาด — transRef มาจาก SlipOK แปลว่ามีเงินโอนเข้าจริง
    // ถ้ามันยังค้างเป็น failed อยู่แสดงว่ามีอะไรผิดพลาดระหว่างทาง ต้องเก็บไว้ให้ตามเก็บด้วยมือ
    // ไม่ใช่ลบทิ้งจนไม่เหลือหลักฐานว่าเคยมีคนจ่ายเงิน
    @Cron(CronExpression.EVERY_5_MINUTES)
    async deleteOldFailedDonations() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const result = await this.prisma.donation.deleteMany({
            where: {
                status: 'failed',
                expiresAt: { lt: oneHourAgo },
                transRef: null,
            },
        });

        if (result.count > 0) {
            this.logger.log(`Deleted ${result.count} old failed donation(s)`);
        }
    }
}