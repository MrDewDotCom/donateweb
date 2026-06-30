import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DonationsModule } from './donations/donations.module';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SettingsModule } from './settings/settings.module';
import { SlipokModule } from './slipok/slipok.module';
import { AuthModule } from './auth/auth.module';
import { TtsModule } from './tts/tts.module';

// หมายเหตุเรื่อง static files:
// - /uploads (สลิป) ไม่ public — เสิร์ฟผ่าน UploadsServeController (signed URL, 15 นาที) เท่านั้น
// - /sounds (เสียงแจ้งเตือนที่ admin อัปโหลดเอง) ไม่ sensitive เหมือนสลิป จึง public ได้ตามปกติ
// - /tts (เสียงที่ generate จาก Edge TTS ต่อ donation) ก็ไม่ sensitive เหมือนกัน เสิร์ฟ public ได้

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // ค่า default: ทุก request จำกัดที่ 60 ครั้ง / 60 วินาที ต่อ IP
    // endpoint ที่เสี่ยงสูง (เช่น /upload, POST /donations) จะ override เข้มกว่านี้
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'sounds'),
        serveRoot: '/sounds',
      },
      {
        rootPath: join(process.cwd(), 'overlay-images'),
        serveRoot: '/overlay-images',
      },
      {
        rootPath: join(process.cwd(), 'tts-audio'),
        serveRoot: '/tts',
      },
    ),
    CommonModule,

    PrismaModule,
    DonationsModule,
    PaymentModule,
    CampaignsModule,
    SettingsModule,
    SlipokModule,
    AuthModule,
    TtsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ใช้ ThrottlerGuard เป็น guard เริ่มต้นกับทุก route ในระบบ
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
