import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PrismaModule } from 'prisma/src/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule { }
