/**
 * ตรวจ environment variable ตอน start
 *
 * ปัญหาเดิม: ตัวแปรที่ขาดไปจะไปพังตอนไหนก็ได้แล้วแต่ว่าใครอ่านเมื่อไหร่
 *   - JWT_SECRET หายไป → พังตอน boot แต่ error ไม่ได้บอกว่าต้องไปเติมใน .env
 *   - UPLOADS_SIGNING_SECRET หายไป → start ได้ปกติ แล้วค่อยพังเป็น 500
 *     ตอน admin กดดูสลิปครั้งแรก ซึ่งอาจเป็นอีกหลายวันถัดมา
 *
 * ตอนนี้ตรวจให้ครบตั้งแต่วินาทีแรก และบอกชื่อตัวแปรที่ขาดไปตรงๆ
 */

const REQUIRED_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD_HASH',
    'UPLOADS_SIGNING_SECRET',
    'SLIPOK_API_KEY',
    'SLIPOK_BRANCH_ID',
] as const;

// ความยาวขั้นต่ำของ secret ที่ใช้เซ็น — สั้นกว่านี้เดาได้ง่ายเกินไป
const MIN_SECRET_LENGTH = 32;
const SECRET_VARS = ['JWT_SECRET', 'UPLOADS_SIGNING_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
    const missing: string[] = [];
    const weak: string[] = [];

    for (const key of REQUIRED_VARS) {
        const value = config[key];

        if (typeof value !== 'string' || value.trim() === '') {
            missing.push(key);
        }
    }

    for (const key of SECRET_VARS) {
        const value = config[key];

        if (typeof value === 'string' && value.trim() !== '' && value.length < MIN_SECRET_LENGTH) {
            weak.push(key);
        }
    }

    const problems: string[] = [];

    if (missing.length > 0) {
        problems.push(`ไม่ได้ตั้งค่า: ${missing.join(', ')}`);
    }

    if (weak.length > 0) {
        problems.push(
            `สั้นเกินไป (ต้องยาวอย่างน้อย ${MIN_SECRET_LENGTH} ตัวอักษร): ${weak.join(', ')}`,
        );
    }

    if (problems.length > 0) {
        throw new Error(
            `Environment ไม่ถูกต้อง — ${problems.join(' | ')}\n` +
            `ดูตัวอย่างการตั้งค่าทั้งหมดได้ที่ back/.env.example`,
        );
    }

    return config;
}
