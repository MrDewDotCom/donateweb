export const BANNED_WORDS = [
    "เหี้ย",
    "เชี่ย",
    "เชี้ย",
    "ห่า",
    "สัส",
    "สัตว์",
    "ไอสัส",
    "อิสัส",
    "อีสัส",
    "ไอเหี้ย",
    "อีเหี้ย",
    "ไอห่า",
    "อีห่า",
    "ควาย",
    "ไอควาย",
    "อีควาย",
    "ส้นตีน",
    "ตีน",
    "ระยำ",
    "สันดาน",
    "ควย",
    "หี",
    "เย็ด",
    "แตด",
    "จิ๋ม",
    "จู๋",
    "เงี่ยน",
    "เสียว",
    "ดอกทอง",
    "อีดอก",
    "กระหรี่",
    "กะหรี่",

    // คำแปรรูป/สะกดเลี่ยงที่พบบ่อย (เติมสระ-วรรณยุกต์ผิดปกติ, พิมพ์ผิดตั้งใจ)
    "เหมี้ย",
    "เหี่ย",
    "เหือก",
    "สาส",
    "สัดสัด",
    "ไอสัด",
    "อีสัด",
    "โคย",
    "ควยยย",
    "หีี",
    "เยด",
    "เย้ด",
    "จิม",
    "จู๋จู๋",
    "กระหรี",
    "กะหรี",
    "เชี่ยไร",
    "เหี้ยไร", "กาก", "กระจอก", "สถุน  ",

    "fuck",
    "fucking",
    "fuk",
    "fck",
    "f*ck",
    "shit",
    "sh*t",
    "bitch",
    "b*tch",
    "asshole",
    "motherfucker",
    "dick",
    "cock",
    "pussy",
    "cunt",
];

/**
 * ตัดตัวอักษรที่มักถูกใช้ "คั่น" คำเพื่อหลบตัวกรอง
 * เช่น ช่องว่าง, จุด, ขีด, underscore, ดอกจัน ที่แทรกอยู่ระหว่างตัวอักษร
 */
function stripSeparators(input: string): string {
    return input.replace(/[\s._\-*|~^]+/g, "");
}

/**
 * ยุบตัวอักษรที่พิมพ์ซ้ำติดกันเกิน 2 ตัว ให้เหลือ 1 ตัว
 * (กันการยืดคำเพื่อหลบตัวกรอง เช่น "เหี้ยยยยย" -> "เหี้ย")
 */
function collapseRepeats(input: string): string {
    return input.replace(/(.)\1{2,}/gu, "$1");
}

/**
 * normalize ข้อความสำหรับเทียบกับ BANNED_WORDS
 * ใช้ฟังก์ชันนี้กับทั้งข้อความที่ต้องการตรวจ และคำใน BANNED_WORDS (ตอน build ครั้งเดียว)
 */
export function normalizeForMatch(input: string): string {
    let text = input.toLowerCase();
    text = stripSeparators(text);
    text = collapseRepeats(text);
    return text;
}

const NORMALIZED_BANNED_WORDS = BANNED_WORDS.map((w) => normalizeForMatch(w));

/**
 * ตรวจว่าข้อความมีคำต้องห้ามหรือไม่
 * ทนต่อการเว้นวรรค/จุด/ขีด/พิมพ์ซ้ำตัวอักษรเพื่อหลบตัวกรอง
 */
export function containsBannedWord(input: string): boolean {
    const normalized = normalizeForMatch(input);
    return NORMALIZED_BANNED_WORDS.some((word) => normalized.includes(word));
}