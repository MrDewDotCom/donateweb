// timezone ของธุรกิจ ต้องตรงกับ APP_TIMEZONE ฝั่ง backend
export const APP_TIMEZONE =
    import.meta.env.VITE_APP_TIMEZONE ?? "Asia/Bangkok";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * แปลงค่าที่ได้จาก API ให้อยู่ในรูป "YYYY-MM-DD" สำหรับใส่ใน <input type="date">
 *
 * ห้ามใช้ iso.slice(0, 10) เด็ดขาด — นั่นคือวันที่แบบ UTC
 * ต้นวันที่ 31 ส.ค. ตามเวลาไทยคือ 2026-08-30T17:00:00Z การ slice จะได้ "2026-08-30"
 * ทำให้ช่องวันที่แสดงเลื่อนไป 1 วันทุกครั้งที่โหลดหน้า
 */
export function toDateInputValue(value?: string | null): string {
    if (!value) return "";

    if (DATE_ONLY_PATTERN.test(value)) return value;

    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) return "";

    // en-CA ให้รูปแบบ YYYY-MM-DD พอดี
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(instant);
}
