export type DonationStatus = "pending" | "paid" | "failed";

export interface Donation {
    id: number;
    name: string;
    message?: string | null;
    displayMessage?: string | null;
    amount: number;
    status: DonationStatus;
    qrCode?: string | null;
    createdAt: string;
    paidAt?: string | null;
    slipImage?: string | null;
    expiresAt?: string | null;
    transRef?: string | null;
}