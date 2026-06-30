import {
    BadRequestException,
    Body,
    Controller,
    Get,
    MaxFileSizeValidator,
    ParseFilePipe,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService:
            SettingsService,
    ) { }

    @Get()
    getSettings() {
        return this.settingsService.getSettings();
    }

    @Get('monthly-goal')
    getMonthlyGoalProgress() {
        return this.settingsService.getMonthlyGoalProgress();
    }

    // รายชื่อเสียงที่อัปโหลดเองไว้แล้ว — ใช้ทำ dropdown ใน Settings
    @UseGuards(JwtAuthGuard)
    @Get('sounds')
    listSounds() {
        return this.settingsService.listSounds();
    }

    // อัปโหลดเสียงแจ้งเตือนใหม่ — จำกัด 5MB, รับเฉพาะ mp3/wav/ogg
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseGuards(JwtAuthGuard)
    @Post('sounds')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    uploadSound(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        if (!this.settingsService.isAllowedSoundExt(file.originalname)) {
            throw new BadRequestException('รองรับเฉพาะไฟล์ .mp3 .wav .ogg เท่านั้น');
        }

        return this.settingsService.uploadSound(file);
    }

    // รายชื่อรูปที่อัปโหลดเองไว้แล้ว (รองรับ .gif)
    @UseGuards(JwtAuthGuard)
    @Get('overlay-images')
    listOverlayImages() {
        return this.settingsService.listOverlayImages();
    }

    // อัปโหลดรูป Overlay ใหม่ — จำกัด 8MB (gif มักไฟล์ใหญ่กว่ารูปนิ่ง), รับ png/jpg/jpeg/gif/webp
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseGuards(JwtAuthGuard)
    @Post('overlay-images')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    uploadOverlayImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        if (!this.settingsService.isAllowedImageExt(file.originalname)) {
            throw new BadRequestException('รองรับเฉพาะไฟล์ .png .jpg .jpeg .gif .webp เท่านั้น');
        }

        return this.settingsService.uploadOverlayImage(file);
    }

    // ส่ง donation ปลอมไปแสดงที่หน้า Overlay จริง เพื่อพรีวิวตอนกำลังปรับ Settings
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseGuards(JwtAuthGuard)
    @Post('test-overlay')
    testOverlay() {
        return this.settingsService.testOverlay();
    }

    // generate ไฟล์เสียง Edge TTS ตัวอย่าง แล้วคืน URL ให้ frontend เล่นเอง
    // ใช้กับปุ่ม "ทดสอบ TTS" ในหน้า Settings
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseGuards(JwtAuthGuard)
    @Post('test-tts')
    testTts() {
        return this.settingsService.testTts();
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    updateSettings(
        @Body()
        updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(updateSettingsDto,);
    }
}