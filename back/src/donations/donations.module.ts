import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentModule } from 'src/payment/payment.module';
import { DonationsGateway } from './donations.gateway';
import { UploadController } from "./upload.controller";
import { UploadsServeController } from "src/common/controllers/upload-serve.controller";
import { SlipokModule } from 'src/slipok/slipok.module';
import { DonationCleanupService } from './donation-cleanup.service';
import { TtsModule } from 'src/tts/tts.module';
import { TimerModule } from 'src/timer/timer.module';
import { VideoModule } from 'src/video/video.module';

@Module({
  imports: [
    PrismaModule,
    PaymentModule,
    SlipokModule,
    TtsModule,
    TimerModule,
    VideoModule,
  ],
  controllers: [
    DonationsController,
    UploadController,
    UploadsServeController,
  ],
  providers: [
    DonationsService,
    DonationsGateway,
    DonationCleanupService,
  ],
  exports: [DonationsGateway],
})
export class DonationsModule { }