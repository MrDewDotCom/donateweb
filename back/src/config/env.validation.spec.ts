import { validateEnv } from './env.validation';

const VALID_ENV = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(64),
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: '$2b$10$abcdefghijklmnopqrstuv',
    UPLOADS_SIGNING_SECRET: 'b'.repeat(64),
    SLIPOK_API_KEY: 'SLIPOK-KEY',
    SLIPOK_BRANCH_ID: '12345',
};

describe('validateEnv', () => {
    it('ผ่านเมื่อตั้งค่าครบ', () => {
        expect(() => validateEnv({ ...VALID_ENV })).not.toThrow();
    });

    it('บอกชื่อตัวแปรที่ขาดไป ไม่ใช่ error กำกวม', () => {
        const { JWT_SECRET, ...incomplete } = VALID_ENV;

        expect(() => validateEnv(incomplete)).toThrow(/JWT_SECRET/);
    });

    it('รายงานตัวแปรที่ขาดทั้งหมดในครั้งเดียว ไม่ต้องไล่แก้ทีละตัว', () => {
        const { JWT_SECRET, SLIPOK_API_KEY, ...incomplete } = VALID_ENV;

        try {
            validateEnv(incomplete);
            fail('ควร throw เมื่อตัวแปรไม่ครบ');
        } catch (error) {
            const message = (error as Error).message;
            expect(message).toContain('JWT_SECRET');
            expect(message).toContain('SLIPOK_API_KEY');
        }
    });

    it('ถือว่าค่าว่างหรือช่องว่างล้วนคือไม่ได้ตั้งค่า', () => {
        expect(() => validateEnv({ ...VALID_ENV, ADMIN_PASSWORD_HASH: '   ' })).toThrow(
            /ADMIN_PASSWORD_HASH/,
        );
    });

    it('ปฏิเสธ secret ที่สั้นเกินไป', () => {
        expect(() => validateEnv({ ...VALID_ENV, JWT_SECRET: 'short' })).toThrow(
            /สั้นเกินไป/,
        );
    });

    it('UPLOADS_SIGNING_SECRET ที่หายไปต้องพังตั้งแต่ boot ไม่ใช่ตอน admin เปิดดูสลิป', () => {
        const { UPLOADS_SIGNING_SECRET, ...incomplete } = VALID_ENV;

        expect(() => validateEnv(incomplete)).toThrow(/UPLOADS_SIGNING_SECRET/);
    });
});
