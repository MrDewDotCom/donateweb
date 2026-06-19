import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DonationsModule } from './donations/donations.module';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SettingsModule } from './settings/settings.module';
import { SlipokModule } from './slipok/slipok.module';
// ServeStaticModule ถูกลบออก — /uploads/ ไม่ public แล้ว
// ตอนนี้เสิร์ฟผ่าน UploadsServeController ที่เช็ค signed URL ก่อนทุกครั้ง


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ค่า default: ทุก request จำกัดที่ 60 ครั้ง / 60 วินาที ต่อ IP
    // endpoint ที่เสี่ยงสูง (เช่น /upload, POST /donations) จะ override เข้มกว่านี้
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    CommonModule,

    PrismaModule,
    DonationsModule,
    PaymentModule,
    CampaignsModule,
    SettingsModule,
    SlipokModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ใช้ ThrottlerGuard เป็น guard เริ่มต้นกับทุก route ในระบบ
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }