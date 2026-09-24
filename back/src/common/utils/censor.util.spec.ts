import { censorMessage } from './censor.util';

/**
 * ข้อความพวกนี้ขึ้นจอสดตอนไลฟ์ ถ้าเซนเซอร์พลาดคือแก้ทีหลังไม่ได้แล้ว
 */
describe('censorMessage', () => {
    it('ปล่อยข้อความปกติผ่านโดยไม่แตะต้อง', () => {
        expect(censorMessage('ขอบคุณสำหรับสตรีมดีๆ ครับ')).toBe(
            'ขอบคุณสำหรับสตรีมดีๆ ครับ',
        );
    });

    it('คืนค่าว่าง/null ตามเดิม', () => {
        expect(censorMessage(null)).toBeNull();
        expect(censorMessage(undefined)).toBeNull();
        expect(censorMessage('')).toBe('');
    });

    it('เซนเซอร์คำหยาบตรงๆ', () => {
        expect(censorMessage('เหี้ย')).not.toContain('เหี้ย');
    });

    it('เซนเซอร์คำที่แทรกอักขระคั่นกลาง', () => {
        const result = censorMessage('ค.ว.ย');
        expect(result).not.toContain('ค.ว.ย');
    });

    it('ไม่เหลือเศษตัวอักษรเมื่อพิมพ์ซ้ำเพื่อเลี่ยงการตรวจ', () => {
        // บั๊กเดิม: normalize ยุบตัวซ้ำตอน "หา" แต่ regex ตอน "แทน" ไม่ได้เผื่อไว้
        // ทำให้ "ควยยยย" กลายเป็น "***ยยย" คือยังอ่านออกอยู่ดี
        const result = censorMessage('ควยยยย');
        expect(result).toBe('***');
    });

    it('เซนเซอร์เฉพาะส่วนที่เป็นคำหยาบ ไม่กินข้อความรอบข้าง', () => {
        const result = censorMessage('สวัสดี เหี้ย นะ');
        expect(result).toContain('สวัสดี');
        expect(result).toContain('นะ');
        expect(result).not.toContain('เหี้ย');
    });
});
