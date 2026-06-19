import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DonationsModule } from './donations/donations.module';
import { PrismaModule } from 'prisma/src/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SettingsModule } from './settings/settings.module';
import { SlipokModule } from './slipok/slipok.module';
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    ServeStaticModule.forRoot({
      rootPath: join(
        process.cwd(),
        "uploads",
      ),

      serveRoot:
        "/uploads",
    }),

    PrismaModule,
    DonationsModule,
    PaymentModule,
    CampaignsModule,
    SettingsModule,
    SlipokModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
