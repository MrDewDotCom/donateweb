export interface RecentDonation {
    id: number;

    name: string;

    amount: number;

    message?: string;

    // ข้อความที่เซนเซอร์คำหยาบแล้ว (จาก backend) — ใช้อันนี้แสดงผลในที่สาธารณะ
    displayMessage?: string | null;

    paidAt?: string;
}