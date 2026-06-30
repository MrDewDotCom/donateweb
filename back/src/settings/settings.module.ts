import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from 'prisma/src/prisma.module';
import { DonationsModule } from 'src/donations/donations.module';
import { TtsModule } from 'src/tts/tts.module';

@Module({
    imports: [
        TtsModule,
        PrismaModule,
        DonationsModule, // ใช้ DonationsGateway สำหรับปุ่ม "ทดสอบ Overlay"
    ],

    controllers: [
        SettingsController,
    ],

    providers: [
        SettingsService,
    ],
})
export class SettingsModule { }