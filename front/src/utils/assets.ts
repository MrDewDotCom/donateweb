import { API_URL } from "../config/api";

/**
 * แปลง path ที่เก็บใน Settings ให้เป็น URL ที่โหลดได้จริง
 *
 * ทำไมต้องมีไฟล์นี้: เดิมหน้า Settings เก็บ URL เต็ม (`http://localhost:3000/sounds/x.mp3`)
 * ลงฐานข้อมูลเลย พอย้าย backend ขึ้นโดเมนจริงหรือเปลี่ยนพอร์ต ค่าที่เคยบันทึกไว้ทั้งหมด
 * จะชี้ไปที่เครื่องเดิมและโหลดไม่ขึ้น แถมใช้ฐานข้อมูลร่วมกันระหว่าง dev/prod ไม่ได้ด้วย
 *
 * ตอนนี้เก็บเป็น path อย่างเดียว แล้วค่อยประกอบกับ API_URL ตอนจะใช้
 *
 * กฎการตีความค่าที่เก็บไว้:
 *   "http://..."        → ค่าเก่าจากก่อนแก้ ใช้ตามนั้นไปเลย (ยังโหลดได้ถ้ายังอยู่เครื่องเดิม)
 *   "/sounds/x.mp3"     → ไฟล์ที่ admin อัปโหลด เก็บอยู่ที่ backend
 *   "donation.mp3"      → เสียงตั้งต้นที่มากับตัว frontend เอง (อยู่ใน public/sounds)
 */

function isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

/** ไฟล์ที่โฮสต์อยู่ฝั่ง backend เช่น รูป overlay */
export function resolveBackendAsset(value?: string | null): string {
    if (!value) return "";
    if (isAbsoluteUrl(value)) return value;

    return `${API_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

/** เสียงแจ้งเตือน — ชื่อไฟล์เปล่าๆ หมายถึงเสียงตั้งต้นที่อยู่ใน public/sounds ของ frontend */
export function resolveAlertSoundUrl(value?: string | null): string {
    const sound = value || "donation.mp3";

    if (isAbsoluteUrl(sound)) return sound;
    if (sound.startsWith("/")) return `${API_URL}${sound}`;

    return `/sounds/${sound}`;
}
