import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DonationsGateway } from 'src/donations/donations.gateway';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_SOUND_EXT = new Set(['.mp3', '.wav', '.ogg']);
const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const SOUNDS_DIR = path.resolve('./sounds');
const OVERLAY_IMAGES_DIR = path.resolve('./overlay-images');

// เช็ค magic bytes กัน MIME spoofing — รองรับ GIF เพิ่มจากที่ใช้กับสลิป (jpg/png/webp เท่านั้น)
function isValidOverlayImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

    // PNG
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    )
        return true;

    // WEBP
    if (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    )
        return true;

    // GIF (GIF87a / GIF89a)
    if (buffer.toString('ascii', 0, 4) === 'GIF8') return true;

    return false;
}

@Injectable()
export class SettingsService {
    constructor(
        private prisma: PrismaService,
        private donationsGateway: DonationsGateway,
    ) { }

    async getSettings() {
        let settings =
            await this.prisma.setting.findFirst();

        if (!settings) {
            settings =
                await this.prisma.setting.create({
                    data: {},
                });
        }

        return settings;
    }

    async updateSettings(data: UpdateSettingsDto) {
        const settings = await this.getSettings();

        const min = data.minDonationAmount ?? settings.minDonationAmount;
        const max = data.maxDonationAmount ?? settings.maxDonationAmount;

        if (min != null && max != null && min > max) {
            throw new BadRequestException(
                'จำนวนโดเนทขั้นต่ำต้องไม่มากกว่าจำนวนโดเนทสูงสุด',
            );
        }

        return this.prisma.setting.update({
            where: {
                id: settings.id,
            },
            data,
        });
    }

    async getSetting() {
        return this.prisma.setting.findFirst();
    }

    async updateSetting(
        dto: UpdateSettingsDto,
    ) {
        return this.prisma.setting.update({
            where: { id: 1 },
            data: dto,
        });
    }

    async getMonthlyGoalProgress() {
        const settings = await this.getSettings();

        if (!settings.monthlyGoalAmount) {
            return null;
        }

        const where: { status: string; paidAt?: { gte: Date } } = {
            status: 'paid',
        };

        if (settings.monthlyGoalAutoReset) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            where.paidAt = { gte: startOfMonth };
        }

        const result = await this.prisma.donation.aggregate({
            _sum: { amount: true },
            where,
        });

        const currentAmount = result._sum.amount ?? 0;
        const percentage = Math.floor(
            (currentAmount / settings.monthlyGoalAmount) * 100,
        );

        return {
            goalAmount: settings.monthlyGoalAmount,
            currentAmount,
            percentage,
            autoReset: settings.monthlyGoalAutoReset,
        };
    }

    // ---------- อัปโหลดเสียงแจ้งเตือนเอง ----------

    private ensureSoundsDir() {
        if (!fs.existsSync(SOUNDS_DIR)) {
            fs.mkdirSync(SOUNDS_DIR, { recursive: true });
        }
    }

    // เช็คนามสกุลไฟล์เสียงที่อนุญาต (ควบคู่กับ FileTypeValidator ที่ controller)
    isAllowedSoundExt(filename: string) {
        return ALLOWED_SOUND_EXT.has(path.extname(filename).toLowerCase());
    }

    async uploadSound(file: Express.Multer.File) {
        this.ensureSoundsDir();

        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_SOUND_EXT.has(ext) ? ext : '.mp3';
        const filename = `${randomUUID()}${safeExt}`;
        const dest = path.join(SOUNDS_DIR, filename);

        // กัน path traversal เช่นเดียวกับตอน upload สลิป
        if (!dest.startsWith(SOUNDS_DIR + path.sep)) {
            throw new BadRequestException('ชื่อไฟล์ไม่ถูกต้อง');
        }

        fs.writeFileSync(dest, file.buffer);

        return { filename, url: `/sounds/${filename}` };
    }

    listSounds() {
        this.ensureSoundsDir();

        return fs
            .readdirSync(SOUNDS_DIR)
            .filter((f) => this.isAllowedSoundExt(f))
            .map((filename) => ({ filename, url: `/sounds/${filename}` }));
    }

    // ---------- อัปโหลดรูปสำหรับ Overlay (รองรับ .gif ด้วย) ----------

    private ensureOverlayImagesDir() {
        if (!fs.existsSync(OVERLAY_IMAGES_DIR)) {
            fs.mkdirSync(OVERLAY_IMAGES_DIR, { recursive: true });
        }
    }

    isAllowedImageExt(filename: string) {
        return ALLOWED_IMAGE_EXT.has(path.extname(filename).toLowerCase());
    }

    async uploadOverlayImage(file: Express.Multer.File) {
        if (!isValidOverlayImageBuffer(file.buffer)) {
            throw new BadRequestException('ไฟล์ไม่ใช่รูปภาพที่รองรับ (png/jpg/webp/gif)');
        }

        this.ensureOverlayImagesDir();

        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_IMAGE_EXT.has(ext) ? ext : '.png';
        const filename = `${randomUUID()}${safeExt}`;
        const dest = path.join(OVERLAY_IMAGES_DIR, filename);

        if (!dest.startsWith(OVERLAY_IMAGES_DIR + path.sep)) {
            throw new BadRequestException('ชื่อไฟล์ไม่ถูกต้อง');
        }

        fs.writeFileSync(dest, file.buffer);

        return { filename, url: `/overlay-images/${filename}` };
    }

    listOverlayImages() {
        this.ensureOverlayImagesDir();

        return fs
            .readdirSync(OVERLAY_IMAGES_DIR)
            .filter((f) => this.isAllowedImageExt(f))
            .map((filename) => ({ filename, url: `/overlay-images/${filename}` }));
    }

    // ส่ง donation ปลอมผ่าน socket เพื่อให้ Admin เห็น Overlay จริงตอนกำลังปรับ Settings
    // ไม่บันทึกอะไรลง DB เลย เป็นแค่ event ทดสอบ
    testOverlay() {
        const fakeDonation = {
            id: 0,
            name: 'ทดสอบ Overlay',
            message: 'นี่คือข้อความทดสอบจากหน้า Settings',
            amount: 100,
            status: 'paid',
            createdAt: new Date(),
            paidAt: new Date(),
            qrCode: null,
            accessToken: null,
            slipImage: null,
            transRef: null,
            expiresAt: null,
        };

        this.donationsGateway.emitDonationPaid(fakeDonation as any);

        return { success: true };
    }
}