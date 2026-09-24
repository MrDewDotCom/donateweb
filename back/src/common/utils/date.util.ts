/**
 * ตัวกลางจัดการวันเวลาทั้งระบบ
 *
 * ปัญหาเดิม: ระบบผสม UTC กับเวลาเครื่อง server มั่วไปหมด
 *   - `<input type="date">` ส่ง "2026-08-31" มา แล้วโดน new Date() ตีความเป็น UTC เที่ยงคืน
 *     ซึ่งเท่ากับ 07:00 ของวันที่ 31 ตามเวลาไทย → แคมเปญที่ตั้งให้จบวันที่ 31
 *     จะหยุดนับตั้งแต่ 7 โมงเช้า หายไปเกือบทั้งวัน
 *   - getDailyStats กรองด้วยเที่ยงคืนเวลาเครื่อง แต่จัดกลุ่มด้วยวันที่แบบ UTC
 *     ทำให้โดเนทช่วงเที่ยงคืนถึง 7 โมงไปโผล่ผิดวัน หรือหลุดกราฟไปเลย
 *
 * ทุกการคำนวณขอบเขตวันต้องผ่านไฟล์นี้เท่านั้น ห้ามใช้ new Date(str) กับวันที่ดิบ
 * หรือ setHours()/getMonth() ตรงๆ ใน service อีก
 */

// ตั้งใน .env ได้ ถ้าไม่ตั้งใช้เวลาไทยเป็นค่าเริ่มต้น (ผู้ใช้ระบบนี้อยู่ไทยทั้งหมด)
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Bangkok';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * ระยะห่างระหว่างเวลาใน timeZone กับ UTC ณ ช่วงเวลาหนึ่ง (มิลลิวินาที)
 * ใช้ Intl แทนการ hardcode +7 เพื่อให้เปลี่ยน timezone ทีหลังได้โดยไม่ต้องแก้ logic
 */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(instant);

    const value: Record<string, number> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            value[part.type] = Number(part.value);
        }
    }

    // ICU บางเวอร์ชันคืน hour เป็น 24 ตอนเที่ยงคืน ต้อง mod กันพลาด
    const wallClockAsUtc = Date.UTC(
        value.year,
        value.month - 1,
        value.day,
        value.hour % 24,
        value.minute,
        value.second,
    );

    // Intl ให้ความละเอียดแค่ระดับวินาที ต้องตัดมิลลิวินาทีของ instant ทิ้งก่อนลบ
    // ไม่งั้น offset จะเพี้ยนไปตามเศษ ms (เช่น endOfDay ที่มี .999 จะเลื่อนไป 999ms)
    // ทุก timezone ต่างกันเป็นจำนวนนาทีเต็มอยู่แล้ว ค่า ms จึงไม่มีผลกับ offset
    const instantWholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;

    return wallClockAsUtc - instantWholeSeconds;
}

/**
 * แปลง "เวลาหน้าปัดใน timezone ของแอป" → instant จริง (UTC)
 * เช่น 2026-08-31 00:00 ตามเวลาไทย → 2026-08-30T17:00:00.000Z
 */
function zonedWallClockToInstant(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    ms: number,
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms);

    // เดารอบแรกจาก offset ณ เวลาที่เดา แล้วเช็คซ้ำอีกรอบ
    // (ไทยไม่มี DST แต่เผื่อไว้ให้ย้าย timezone ได้โดยไม่พัง)
    const firstGuess = new Date(naive - getTimeZoneOffsetMs(new Date(naive), APP_TIMEZONE));
    const refinedOffset = getTimeZoneOffsetMs(firstGuess, APP_TIMEZONE);

    return new Date(naive - refinedOffset);
}

/** แยก "2026-08-31" ออกเป็นตัวเลข ปี/เดือน/วัน */
function splitDateOnly(dateOnly: string): [number, number, number] {
    const [year, month, day] = dateOnly.split('-').map(Number);
    return [year, month, day];
}

/**
 * จุดเริ่มต้นของวัน (00:00:00.000) ตามเวลาไทย
 * รับได้ทั้ง "2026-08-31" และ ISO string เต็ม (กรณีหลังจะยึดวันที่ตามเวลาไทยของ instant นั้น)
 */
export function startOfDay(input: string | Date): Date {
    const dateOnly = toDateKey(input);
    const [year, month, day] = splitDateOnly(dateOnly);

    return zonedWallClockToInstant(year, month, day, 0, 0, 0, 0);
}

/**
 * จุดสิ้นสุดของวัน (23:59:59.999) ตามเวลาไทย
 *
 * สำคัญกับช่วงวันที่แบบ "ถึงวันที่ X" ทุกที่ — ถ้าใช้ startOfDay แทน
 * จะกลายเป็นตัดยอดตั้งแต่เที่ยงคืน ทำให้ทั้งวันสุดท้ายไม่ถูกนับ
 */
export function endOfDay(input: string | Date): Date {
    const dateOnly = toDateKey(input);
    const [year, month, day] = splitDateOnly(dateOnly);

    return zonedWallClockToInstant(year, month, day, 23, 59, 59, 999);
}

/** วันที่ 1 ของเดือนปัจจุบัน เวลา 00:00 ตามเวลาไทย — ใช้กับเป้าหมายรายเดือน */
export function startOfCurrentMonth(now: Date = new Date()): Date {
    const [year, month] = splitDateOnly(toDateKey(now));

    return zonedWallClockToInstant(year, month, 1, 0, 0, 0, 0);
}

/**
 * คีย์วันที่ "YYYY-MM-DD" ตามเวลาไทย
 * ใช้จัดกลุ่มยอดรายวัน แทน toISOString().slice(0,10) ที่เป็น UTC
 */
export function toDateKey(input: string | Date): string {
    if (typeof input === 'string' && DATE_ONLY_PATTERN.test(input)) {
        return input;
    }

    const instant = typeof input === 'string' ? new Date(input) : input;

    // en-CA ให้รูปแบบ YYYY-MM-DD พอดี
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instant);
}

/** จุดเริ่มต้นของวันที่ย้อนหลังไป n วัน ตามเวลาไทย */
export function startOfDayDaysAgo(daysAgo: number, now: Date = new Date()): Date {
    return startOfDay(new Date(now.getTime() - daysAgo * MS_PER_DAY));
}

/** บวกวันแบบเที่ยงตรง ใช้เดินลูปสร้าง bucket รายวัน */
export function addDays(instant: Date, days: number): Date {
    return new Date(instant.getTime() + days * MS_PER_DAY);
}
