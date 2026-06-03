export interface Donation {
    id: number;
    name: string;
    message?: string | null;
    amount: number;
    status: string;
    qrCode?: string | null;
    createdAt: string;
    paidAt?: string | null;
}