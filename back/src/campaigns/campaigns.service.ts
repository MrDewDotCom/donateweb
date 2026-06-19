import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
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


    async getTopDonators() {
        const campaign =
            await this.prisma.campaign.findFirst({
                where: {
                    isActive: true,
                },
            });

        if (!campaign) {
            return [];
        }

        const donations =
            await this.prisma.donation.findMany({
                where: {
                    status: "paid",
                    paidAt: {
                        gte: campaign.startDate,
                        lte: campaign.endDate,
                    },
                },
            });

        const totals = donations.reduce(
            (acc, donation) => {
                acc[donation.name] =
                    (acc[donation.name] || 0) +
                    donation.amount;

                return acc;
            },
            {} as Record<string, number>,
        );

        return Object.entries(totals)
            .map(([name, total]) => ({
                name,
                total,
            }))
            .sort(
                (a, b) =>
                    b.total - a.total,
            )
            .slice(0, campaign.topDonatorLimit,);
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