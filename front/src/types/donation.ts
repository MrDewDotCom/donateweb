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
    // standard | timer — timerSeconds มีค่าเฉพาะโดเนทจับเวลา
    type?: "standard" | "timer" | "video";
    timerSeconds?: number | null;
    // โดเนทคลิป
    videoId?: string | null;
    videoTitle?: string | null;
    videoSeconds?: number | null;
    videoStatus?: "queued" | "playing" | "played" | "skipped" | null;
    // true = มี alert ก่อนเล่นคลิป, false = เล่นคลิปอย่างเดียว
    videoAlert?: boolean | null;
    // จาก event donationPaid: true = ไม่ต้องแสดง alert (widget อื่นใช้รีเฟรชยอดอย่างเดียว)
    silent?: boolean;
    // URL ของไฟล์เสียงที่ generate จาก Edge TTS (backend) — มีค่าเฉพาะตอน emit ผ่าน
    // event "donationPaid" เท่านั้น ไม่ persist ใน DB เป็นไฟล์ static ชั่วคราว
    ttsAudioUrl?: string | null;
}