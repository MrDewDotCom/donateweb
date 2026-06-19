import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from 'src/payment/payment.module';
import { DonationsGateway } from './donations.gateway';
import { UploadController } from "./upload.controller";
import { SlipokModule } from 'src/slipok/slipok.module';
import { UploadsServeController } from 'src/common/controllers/upload-serve.controller';

@Module({
  imports: [
    PrismaModule,
    PaymentModule,
    SlipokModule,
  ],
  controllers: [
    DonationsController,
    UploadController,
    UploadsServeController,
  ],
  providers: [
    DonationsService,
    DonationsGateway
  ],
})
export class DonationsModule { }