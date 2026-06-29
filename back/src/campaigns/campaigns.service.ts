import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { sanitizeDonations } from 'src/common/utils/donation.util';

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
    async createCampaign(dto: CreateCampaignDto) {
        const isActive = dto.isActive ?? true;

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
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                isActive,
                ...(dto.topDonatorLimit != null && { topDonatorLimit: dto.topDonatorLimit }),
                ...(dto.recentLimit != null && { recentLimit: dto.recentLimit }),
            },
        });
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
    async getTopDonators() {
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
        const limit = activeCampaign?.topDonatorLimit ?? settings?.topDonatorsLimit ?? 3;

        if (mode === 'campaign') {
            if (!activeCampaign) {
                return []; // คงพฤติกรรมเดิม: ไม่มี campaign active ก็ไม่มีอะไรให้โชว์
            }
            where.paidAt = { gte: activeCampaign.startDate, lte: activeCampaign.endDate };
        } else if (mode === 'custom') {
            const range: { gte?: Date; lte?: Date } = {};
            if (settings?.topDonatorFrom) range.gte = settings.topDonatorFrom;
            if (settings?.topDonatorTo) range.lte = settings.topDonatorTo;
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

    async getRecentDonations() {
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
            take: campaign.recentLimit,
        });

        return sanitizeDonations(donations);
    }

    async updateCampaign(
        id: number,
        data: UpdateCampaignDto,
    ) {
        return this.prisma.campaign.update({
            where: { id },
            data,
        });
    }
}