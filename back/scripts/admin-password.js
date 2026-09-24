/**
 * ตรวจ/สร้าง ADMIN_PASSWORD_HASH สำหรับหน้า login ของ admin
 *
 * รันจากโฟลเดอร์ back/ :
 *
 *   node scripts/admin-password.js check     ← เช็คว่ารหัสที่พิมพ์ตรงกับ hash ใน .env ไหม
 *   node scripts/admin-password.js hash      ← สร้าง hash ใหม่ไปวางใน .env
 *
 * รหัสผ่านจะถูกพิมพ์ตอนรันสคริปต์เท่านั้น ไม่ถูกเก็บลงไฟล์
 * และไม่ถูกส่งออกไปไหนทั้งนั้น
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');

const ENV_PATH = path.join(__dirname, '..', '.env');
const ROUNDS = 12;

/** อ่านค่าตัวแปรตัวเดียวจาก .env แบบตรงๆ (ไม่ต้องพึ่ง dotenv) */
function readEnvVar(key) {
    if (!fs.existsSync(ENV_PATH)) {
        return null;
    }

    for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
        if (!line.startsWith(`${key}=`)) {
            continue;
        }

        let value = line.slice(key.length + 1).trim();

        // เผื่อกรณีใส่ quote ครอบไว้
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        return value;
    }

    return null;
}

/** ถามรหัสผ่านโดยไม่ echo ตัวอักษรออกจอ */
function askHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        // ปิดการ echo: เขียนทับทุกตัวที่พิมพ์ด้วย prompt เดิม
        const onWrite = (chunk, encoding, callback) => {
            if (rl.line.length === 0) {
                process.stdout.write(chunk, encoding);
            }
            if (callback) callback();
        };

        rl._writeToOutput = onWrite;

        rl.question(question, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
    });
}

async function main() {
    const mode = process.argv[2];

    if (mode !== 'check' && mode !== 'hash') {
        console.error('ใช้: node scripts/admin-password.js check | hash');
        process.exit(1);
    }

    if (mode === 'check') {
        const hash = readEnvVar('ADMIN_PASSWORD_HASH');
        const username = readEnvVar('ADMIN_USERNAME');

        if (!hash) {
            console.error('ไม่พบ ADMIN_PASSWORD_HASH ใน back/.env');
            process.exit(1);
        }

        console.log(`ADMIN_USERNAME ใน .env คือ: "${username}"`);
        console.log(`(หน้า login ต้องพิมพ์ username ให้ตรงตัวนี้เป๊ะๆ รวมตัวพิมพ์เล็ก/ใหญ่)\n`);

        const password = await askHidden('พิมพ์รหัสผ่านที่ใช้ตอน login: ');
        const matches = await bcrypt.compare(password, hash);

        if (matches) {
            console.log('\n✅ ตรงกัน — รหัสนี้ใช้ login ได้');
            console.log('   ถ้ายัง login ไม่ได้ แปลว่าปัญหาอยู่ที่ username หรือฝั่ง frontend');
        } else {
            console.log('\n❌ ไม่ตรงกับ hash ใน .env');
            console.log(`   ความยาวที่พิมพ์: ${password.length} ตัวอักษร`);
            console.log('   ตั้งใหม่ด้วย: node scripts/admin-password.js hash');
        }

        return;
    }

    const password = await askHidden('ตั้งรหัสผ่านใหม่: ');

    if (password.length < 8) {
        console.error('\nรหัสผ่านสั้นเกินไป (ควรยาวอย่างน้อย 8 ตัวอักษร)');
        process.exit(1);
    }

    const confirm = await askHidden('พิมพ์อีกครั้งเพื่อยืนยัน: ');

    if (password !== confirm) {
        console.error('\nรหัสผ่านสองครั้งไม่ตรงกัน');
        process.exit(1);
    }

    const hash = await bcrypt.hash(password, ROUNDS);

    console.log('\nเอาบรรทัดนี้ไปวางแทนของเดิมใน back/.env แล้ว restart backend:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
