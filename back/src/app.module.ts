import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DonationsModule } from './donations/donations.module';
import { PrismaModule } from 'prisma/src/prisma.module';


@Module({
  imports: [
    PrismaModule,
    DonationsModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
