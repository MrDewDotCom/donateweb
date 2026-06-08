import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';

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
}