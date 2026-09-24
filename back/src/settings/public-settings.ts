import { Setting } from '@prisma/client';

// settings ที่เปิดให้คนทั่วไปเห็นได้ (หน้าโดเนท, overlay, widget)
// ตัดเลขพร้อมเพย์ (เบอร์โทร/เลขบัตร) ออก — ใช้สร้าง QR ที่ฝั่ง server อย่างเดียว
export type PublicSettings = Omit<Setting, 'promptpayNumber'>;

export function toPublicSettings(settings: Setting): PublicSettings {
    const { promptpayNumber: _promptpay, ...rest } = settings;
    return rest;
}
