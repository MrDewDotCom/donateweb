import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async getSettings() {
        let settings =
            await this.prisma.setting.findFirst();

        if (!settings) {
            settings =
                await this.prisma.setting.create({
                    data: {},
                });
        }

        return settings;
    }

    async updateSettings(data: UpdateSettingsDto) {
        const settings = await this.getSettings();

        // เช็ค min <= max ถ้ามีการตั้งทั้งสองค่า (กันตั้งค่าขัดกันเอง)
        const min = data.minDonationAmount ?? settings.minDonationAmount;
        const max = data.maxDonationAmount ?? settings.maxDonationAmount;

        if (min != null && max != null && min > max) {
            throw new BadRequestException(
                'จำนวนโดเนทขั้นต่ำต้องไม่มากกว่าจำนวนโดเนทสูงสุด',
            );
        }

        return this.prisma.setting.update({
            where: {
                id: settings.id,
            },
            data,
        });
    }

    async getSetting() {
        return this.prisma.setting.findFirst();
    }

    async updateSetting(
        dto: UpdateSettingsDto,
    ) {
        return this.prisma.setting.update({
            where: { id: 1 },
            data: dto,
        });
    }

    // เป้าหมายรายเดือน — ถ้า autoReset เปิด นับเฉพาะยอดที่จ่ายในเดือนปัจจุบัน
    // ถ้าปิด นับสะสมยอดที่จ่ายทั้งหมดตลอดเวลาเทียบกับเป้าเดียวนี้
    async getMonthlyGoalProgress() {
        const settings = await this.getSettings();

        if (!settings.monthlyGoalAmount) {
            return null;
        }

        const where: { status: string; paidAt?: { gte: Date } } = {
            status: 'paid',
        };

        if (settings.monthlyGoalAutoReset) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            where.paidAt = { gte: startOfMonth };
        }

        const result = await this.prisma.donation.aggregate({
            _sum: { amount: true },
            where,
        });

        const currentAmount = result._sum.amount ?? 0;
        const percentage = Math.floor(
            (currentAmount / settings.monthlyGoalAmount) * 100,
        );

        return {
            goalAmount: settings.monthlyGoalAmount,
            currentAmount,
            percentage,
            autoReset: settings.monthlyGoalAutoReset,
        };
    }
}