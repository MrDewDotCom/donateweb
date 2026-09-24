import {
    addDays,
    endOfDay,
    startOfCurrentMonth,
    startOfDay,
    startOfDayDaysAgo,
    toDateKey,
} from './date.util';

/**
 * เทสชุดนี้ล็อกพฤติกรรมเรื่อง timezone ไว้
 *
 * บั๊กเดิมคือ new Date("2026-08-31") ถูกตีความเป็นเที่ยงคืน UTC = 07:00 ตามเวลาไทย
 * ทำให้ขอบเขตของแคมเปญและช่วงวันที่ทุกที่คลาดไป 7 ชั่วโมง
 * ถ้ามีใครเผลอกลับไปใช้ new Date() ดิบๆ อีก เทสพวกนี้จะจับได้
 */
describe('date.util (Asia/Bangkok)', () => {
    describe('startOfDay', () => {
        it('ตีความวันที่แบบ YYYY-MM-DD เป็นเที่ยงคืนตามเวลาไทย ไม่ใช่ UTC', () => {
            // เที่ยงคืนวันที่ 31 ส.ค. ที่ไทย = 17:00 ของวันที่ 30 ส.ค. UTC
            expect(startOfDay('2026-08-31').toISOString()).toBe('2026-08-30T17:00:00.000Z');
        });

        it('ไม่เปลี่ยนค่าเมื่อเรียกซ้ำ (idempotent)', () => {
            const once = startOfDay('2026-08-31');
            expect(startOfDay(once).toISOString()).toBe(once.toISOString());
        });
    });

    describe('endOfDay', () => {
        it('ครอบคลุมถึงมิลลิวินาทีสุดท้ายของวันตามเวลาไทย', () => {
            expect(endOfDay('2026-08-31').toISOString()).toBe('2026-08-31T16:59:59.999Z');
        });

        it('นับรวมโดเนทที่เข้ามาช่วงดึกของวันสุดท้าย', () => {
            // 23:30 ของวันที่ 31 ส.ค. ตามเวลาไทย = 16:30 UTC ของวันเดียวกัน
            const lateDonation = new Date('2026-08-31T16:30:00.000Z');
            expect(lateDonation.getTime()).toBeLessThanOrEqual(endOfDay('2026-08-31').getTime());
        });

        it('ไม่กินข้ามไปวันถัดไป', () => {
            const nextDayMidnight = new Date('2026-08-31T17:00:00.000Z');
            expect(nextDayMidnight.getTime()).toBeGreaterThan(endOfDay('2026-08-31').getTime());
        });
    });

    describe('toDateKey', () => {
        it('ใช้วันตามเวลาไทย ไม่ใช่วันแบบ UTC', () => {
            // 18:30 UTC = 01:30 ของวันถัดไปตามเวลาไทย
            expect(toDateKey(new Date('2026-08-14T18:30:00.000Z'))).toBe('2026-08-15');
        });

        it('ยังอยู่วันเดิมเมื่อยังไม่ข้ามเที่ยงคืนไทย', () => {
            expect(toDateKey(new Date('2026-08-14T16:00:00.000Z'))).toBe('2026-08-14');
        });

        it('คืนค่าเดิมถ้าส่ง YYYY-MM-DD มาอยู่แล้ว', () => {
            expect(toDateKey('2026-08-31')).toBe('2026-08-31');
        });
    });

    describe('startOfCurrentMonth', () => {
        it('อิงเดือนตามเวลาไทย ไม่ใช่เดือนตามเวลาเครื่อง', () => {
            // 31 ก.ค. 18:00 UTC = 1 ส.ค. 01:00 ที่ไทย → ต้องได้ต้นเดือนสิงหาคม
            const result = startOfCurrentMonth(new Date('2026-07-31T18:00:00.000Z'));
            expect(result.toISOString()).toBe('2026-07-31T17:00:00.000Z');
            expect(toDateKey(result)).toBe('2026-08-01');
        });
    });

    describe('startOfDayDaysAgo + addDays', () => {
        it('สร้าง bucket รายวันได้ครบตามจำนวนวันที่ขอ ไม่ซ้ำไม่ขาด', () => {
            const since = startOfDayDaysAgo(6, new Date('2026-08-14T22:00:00.000Z'));
            const keys = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(since, i)));

            expect(keys).toEqual([
                '2026-08-09',
                '2026-08-10',
                '2026-08-11',
                '2026-08-12',
                '2026-08-13',
                '2026-08-14',
                '2026-08-15',
            ]);
            expect(new Set(keys).size).toBe(7);
        });
    });
});
