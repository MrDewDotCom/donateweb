import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [
    PrismaModule,
    PaymentModule,],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule { }
