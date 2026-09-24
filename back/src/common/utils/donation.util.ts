import { randomUUID } from 'crypto';
import * as path from 'path';
import { Donation } from '@prisma/client';
import { censorMessage } from './censor.util';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export type SafeDonation = Omit<Donation, 'accessToken'> & {
    // ข้อความที่เซนเซอร์คำหยาบแล้ว สำหรับ Overlay/Widget + TTS ใช้แสดงผล/อ่านออกเสียง
    // message (raw) ยังอยู่ครบเหมือนเดิมเผื่อจุดอื่นต้องใช้ของจริง
    displayMessage: string | null;
};

export function sanitizeDonation(donation: Donation): SafeDonation {
    const { accessToken: _token, ...safe } = donation;
    return {
        ...safe,
        displayMessage: censorMessage(donation.message),
    };
}

// ข้อมูลโดเนทสำหรับที่สาธารณะ (หน้าเว็บ, widget, socket ที่ใครก็ต่อได้)
// ส่งเฉพาะที่ต้องแสดง — ไม่มี transRef (เลขอ้างอิงธนาคาร), path สลิป, QR, token
// และข้อความเป็นแบบเซนเซอร์แล้วเท่านั้น
export interface PublicDonation {
    id: number;
    name: string;
    amount: number;
    message: string | null;
    displayMessage: string | null;
    paidAt: Date | null;
    type: string;
    timerSeconds: number | null;
    videoId: string | null;
    videoTitle: string | null;
    videoSeconds: number | null;
}

export function toPublicDonation(donation: Donation): PublicDonation {
    const displayMessage = censorMessage(donation.message);
    return {
        id: donation.id,
        name: donation.name,
        amount: donation.amount,
        message: displayMessage,
        displayMessage,
        paidAt: donation.paidAt,
        type: donation.type,
        timerSeconds: donation.timerSeconds,
        videoId: donation.videoId,
        videoTitle: donation.videoTitle,
        videoSeconds: donation.videoSeconds,
    };
}

export function sanitizeDonations(donations: Donation[]): SafeDonation[] {
    return donations.map(sanitizeDonation);
}

export function safeUploadFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';

    return `${Date.now()}-${randomUUID()}${safeExt}`;
}

export function isValidImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 12) {
        return false;
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return true;
    }

    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return true;
    }

    return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    );
}