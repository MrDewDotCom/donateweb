/**
 * signed URL คือด่านเดียวที่กันไม่ให้คนนอกเข้าถึงรูปสลิป
 * (ซึ่งมีชื่อและเลขบัญชีของผู้บริจาคอยู่) จึงต้องมีเทสคุมไว้
 *
 * ต้องตั้ง secret ก่อน import เพราะ util อ่าน process.env ตอนเรียกใช้
 */
process.env.UPLOADS_SIGNING_SECRET =
    process.env.UPLOADS_SIGNING_SECRET ?? 'test-secret-that-is-long-enough-for-tests';

import { generateSignedUploadUrl, verifySignedUpload } from './signed-url.util';

function parseSignedUrl(url: string) {
    const [pathname, query] = url.split('?');
    const params = new URLSearchParams(query);

    return {
        filename: pathname.replace('/uploads/', ''),
        expires: params.get('expires') ?? undefined,
        token: params.get('token') ?? undefined,
    };
}

describe('signed-url.util', () => {
    it('คืน null เมื่อไม่มีรูปสลิป', () => {
        expect(generateSignedUploadUrl(null)).toBeNull();
    });

    it('ลิงก์ที่สร้างเองต้องผ่านการตรวจ', () => {
        const url = generateSignedUploadUrl('/uploads/slip.jpg');
        const { filename, expires, token } = parseSignedUrl(url!);

        expect(verifySignedUpload(filename, expires, token)).toBe(true);
    });

    it('ปฏิเสธเมื่อ token ถูกแก้', () => {
        const url = generateSignedUploadUrl('/uploads/slip.jpg');
        const { filename, expires, token } = parseSignedUrl(url!);
        const tampered = token!.slice(0, -1) + (token!.endsWith('a') ? 'b' : 'a');

        expect(verifySignedUpload(filename, expires, tampered)).toBe(false);
    });

    it('ปฏิเสธเมื่อเปลี่ยนชื่อไฟล์แต่ใช้ token เดิม — กันดูสลิปของคนอื่น', () => {
        const url = generateSignedUploadUrl('/uploads/slip.jpg');
        const { expires, token } = parseSignedUrl(url!);

        expect(verifySignedUpload('someone-else.jpg', expires, token)).toBe(false);
    });

    it('ปฏิเสธเมื่อยืดเวลาหมดอายุเอง', () => {
        const url = generateSignedUploadUrl('/uploads/slip.jpg');
        const { filename, expires, token } = parseSignedUrl(url!);
        const extended = String(Number(expires) + 60 * 60 * 1000);

        expect(verifySignedUpload(filename, extended, token)).toBe(false);
    });

    it('ปฏิเสธลิงก์ที่หมดอายุแล้ว', () => {
        const expired = String(Date.now() - 1000);
        expect(verifySignedUpload('slip.jpg', expired, 'any-token')).toBe(false);
    });

    it('ปฏิเสธเมื่อไม่ได้แนบ token หรือ expires มา', () => {
        expect(verifySignedUpload('slip.jpg', undefined, undefined)).toBe(false);
        expect(verifySignedUpload('slip.jpg', String(Date.now() + 10000), undefined)).toBe(false);
    });
});
