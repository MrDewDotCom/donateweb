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
    // URL ของไฟล์เสียงที่ generate จาก Edge TTS (backend) — มีค่าเฉพาะตอน emit ผ่าน
    // event "donationPaid" เท่านั้น ไม่ persist ใน DB เป็นไฟล์ static ชั่วคราว
    ttsAudioUrl?: string | null;
}