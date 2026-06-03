import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DonationsModule } from './donations/donations.module';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from './payment/payment.module';


@Module({
  imports: [
    PrismaModule,
    DonationsModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
