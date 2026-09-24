import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { toPublicDonation } from 'src/common/utils/donation.util';
import { endOfDay, startOfDay } from 'src/common/utils/date.util';

@Injectable()
export class CampaignsService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async getActiveCampaign() {
        return this.prisma.campaign.findFirst({
            where: {
                isActive: true,
            },
        });
    }

    // สร้างแคมเปญใหม่ — ถ้าตั้ง isActive ไม่ระบุ จะ default เป็น true
    // และปิดแคมเปญเก่าที่ active อยู่ทั้งหมดก่อน เพื่อให้มี active แคมเปญเดียวเสมอ
    //
    // วันที่: หน้าเว็บส่ง "2026-08-31" มาจาก <input type="date">
    // ต้องตีความเป็นเวลาไทย ไม่ใช่ UTC (ดูเหตุผลใน date.util.ts)
    // - startDate → 00:00:00 ของวันนั้น
    // - endDate   → 23:59:59.999 ของวันนั้น เพื่อให้นับรวมทั้งวันสุดท้าย
    async createCampaign(dto: CreateCampaignDto) {
        const isActive = dto.isActive ?? true;

        const startDate = startOfDay(dto.startDate);
        const endDate = endOfDay(dto.endDate);

        this.assertValidRange(startDate, endDate);

        if (isActive) {
            await this.prisma.campaign.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
        }

        return this.prisma.campaign.create({
            data: {
                title: dto.title,
                goalAmount: dto.goalAmount,
                startDate,
                endDate,
                isActive,
                ...(dto.topDonatorLimit != null && { topDonatorLimit: dto.topDonatorLimit }),
                ...(dto.recentLimit != null && { recentLimit: dto.recentLimit }),
            },
        });
    }

    private assertValidRange(startDate: Date, endDate: Date) {
        if (startDate > endDate) {
            throw new BadRequestException(
                'วันเริ่มแคมเปญต้องไม่อยู่หลังวันสิ้นสุดแคมเปญ',
            );
        }
    }

    async getCampaignProgress() {
        const campaign =
            await this.prisma.campaign.findFirst({
                where: {
                    isActive: true,
                },
            });

        if (!campaign) {
            return null;
        }

        const donations =
            await this.prisma.donation.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    status: "paid",
                    paidAt: {
                        gte: campaign.startDate,
                        lte: campaign.endDate,
                    },
                },
            });

        const currentAmount =
            donations._sum.amount ?? 0;

        const percentage =
            Math.floor(
                (currentAmount /
                    campaign.goalAmount) *
                100,
            );

        return {
            title: campaign.title,
            goalAmount:
                campaign.goalAmount,

            currentAmount,
            percentage,

        };
    }

    // คำนวณ Top Donators ตามโหมดที่ตั้งไว้ใน Settings:
    // - "all"      -> รวมทุกยอดโดเนทตลอดเวลา ไม่ filter วันที่
    // - "campaign" -> อิงช่วง startDate-endDate ของ campaign ที่ active อยู่ (พฤติกรรมเดิม)
    // - "custom"   -> อิงช่วงวันที่ที่ admin กำหนดเองใน Settings (topDonatorFrom/To)
    async getTopDonators(limitOverride?: number) {
        const settings = await this.prisma.setting.findFirst();
        const mode = settings?.topDonatorMode ?? 'campaign';

        const where: { status: string; paidAt?: { gte?: Date; lte?: Date } } = {
            status: 'paid',
        };

        // ใช้ topDonatorLimit ของ campaign เป็นค่า default ถ้ามี campaign active,
        // ไม่งั้น fallback ไปใช้ topDonatorsLimit ของ Setting
        const activeCampaign = await this.prisma.campaign.findFirst({
            where: { isActive: true },
        });
        const limit = limitOverride ?? activeCampaign?.topDonatorLimit ?? settings?.topDonatorsLimit ?? 3;

        if (mode === 'campaign') {
            if (!activeCampaign) {
                return []; // คงพฤติกรรมเดิม: ไม่มี campaign active ก็ไม่มีอะไรให้โชว์
            }
            where.paidAt = { gte: activeCampaign.startDate, lte: activeCampaign.endDate };
        } else if (mode === 'custom') {
            // ค่าที่เก็บใน DB คือ instant ของวันที่ admin เลือก
            // ต้องขยายเป็นทั้งวันตามเวลาไทย ไม่งั้น "ถึงวันที่ X" จะตัดยอดตั้งแต่เที่ยงคืน
            // ทำให้ยอดของวันสุดท้ายหายไปทั้งวัน
            const range: { gte?: Date; lte?: Date } = {};
            if (settings?.topDonatorFrom) range.gte = startOfDay(settings.topDonatorFrom);
            if (settings?.topDonatorTo) range.lte = endOfDay(settings.topDonatorTo);
            if (range.gte || range.lte) where.paidAt = range;
        }
        // mode === 'all' -> ไม่ filter วันที่เลย

        const grouped = await this.prisma.donation.groupBy({
            by: ['name'],
            where,
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: limit,
        });

        return grouped.map((g) => ({
            name: g.name,
            total: g._sum.amount ?? 0,
        }));
    }

    async getRecentDonations(limitOverride?: number) {
        const campaign =
            await this.prisma.campaign.findFirst({
                where: {
                    isActive: true,
                },
            });

        if (!campaign) {
            return [];
        }

        const donations = await this.prisma.donation.findMany({
            where: {
                status: 'paid',
                paidAt: {
                    gte: campaign.startDate,
                    lte: campaign.endDate,
                },
            },
            orderBy: {
                paidAt: 'desc',
            },
            take: limitOverride ?? campaign.recentLimit,
        });

        // endpoint สาธารณะ — ส่งเฉพาะข้อมูลที่แสดงได้
        return donations.map(toPublicDonation);
    }

    // แก้ไขแคมเปญ — แปลงวันที่ด้วยกฎเดียวกับตอนสร้าง และกันไม่ให้มีแคมเปญ active หลายอันพร้อมกัน
    async updateCampaign(
        id: number,
        data: UpdateCampaignDto,
    ) {
        const { startDate, endDate, ...rest } = data;

        const existing = await this.prisma.campaign.findUnique({ where: { id } });

        if (!existing) {
            throw new NotFoundException('ไม่พบแคมเปญนี้');
        }

        const nextStart = startDate ? startOfDay(startDate) : existing.startDate;
        const nextEnd = endDate ? endOfDay(endDate) : existing.endDate;

        this.assertValidRange(nextStart, nextEnd);

        // ถ้าเปิดแคมเปญนี้ ต้องปิดตัวอื่นก่อน ไม่งั้นจะมี active หลายอัน
        // แล้ว findFirst ที่ใช้ทุกที่จะหยิบมาแบบไม่แน่นอนว่าอันไหน
        if (rest.isActive === true) {
            await this.prisma.campaign.updateMany({
                where: { isActive: true, id: { not: id } },
                data: { isActive: false },
            });
        }

        return this.prisma.campaign.update({
            where: { id },
            data: {
                ...rest,
                ...(startDate && { startDate: nextStart }),
                ...(endDate && { endDate: nextEnd }),
            },
        });
    }
}