import { createHmac } from 'crypto';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 นาที

function getSecret(): string {
    const secret = process.env.UPLOADS_SIGNING_SECRET;
    if (!secret) {
        throw new Error('UPLOADS_SIGNING_SECRET is not configured in .env');
    }
    return secret;
}

function sign(filename: string, expires: number): string {
    return createHmac('sha256', getSecret())
        .update(`${filename}:${expires}`)
        .digest('hex');
}

/**
 * สร้าง signed URL สำหรับเข้าถึงไฟล์สลิป (ใช้ตอน admin ดึงข้อมูล donation เท่านั้น)
 * URL จะหมดอายุภายใน 15 นาที
 */
export function generateSignedUploadUrl(slipImagePath: string | null): string | null {
    if (!slipImagePath) {
        return null;
    }

    // slipImagePath เก็บเป็น "/uploads/xxxx.jpg" → ดึงเฉพาะชื่อไฟล์
    const filename = slipImagePath.replace(/^\/uploads\//, '');
    const expires = Date.now() + SIGNED_URL_TTL_MS;
    const token = sign(filename, expires);

    return `/uploads/${filename}?expires=${expires}&token=${token}`;
}

/**
 * เช็คว่า token + expires ที่แนบมากับ request ถูกต้องและยังไม่หมดอายุ
 */
export function verifySignedUpload(
    filename: string,
    expiresRaw: string | undefined,
    token: string | undefined,
): boolean {
    if (!expiresRaw || !token) {
        return false;
    }

    const expires = Number(expiresRaw);
    if (!Number.isFinite(expires) || Date.now() > expires) {
        return false; // หมดอายุแล้ว
    }

    const expected = sign(filename, expires);

    // เทียบความยาวก่อนเพื่อกัน timing attack เบื้องต้น
    if (expected.length !== token.length) {
        return false;
    }

    return expected === token;
}