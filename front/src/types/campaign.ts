export interface Campaign {
    id: number;

    title: string;

    goalAmount: number;

    topDonatorLimit: number;

    recentLimit: number;

    startDate: string;

    endDate: string;

    isActive: boolean;
}