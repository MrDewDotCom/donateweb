import { randomUUID } from 'crypto';
import * as path from 'path';
import { Donation } from '@prisma/client';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export type SafeDonation = Omit<Donation, 'accessToken'>;

export function sanitizeDonation(donation: Donation): SafeDonation {
    const { accessToken: _token, ...safe } = donation;
    return safe;
}

export function sanitizeDonations(donations: Donation[]): SafeDonation[] {
    return donations.map(sanitizeDonation);
}

export function safeUploadFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';

    return `${Date.now()}-${randomUUID()}${safeExt}`;
}

export function isValidImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 12) {
        return false;
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return true;
    }

    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return true;
    }

    return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    );
}
