import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { PrismaModule } from 'prisma/src/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CampaignsService],
  controllers: [CampaignsController]
})
export class CampaignsModule { }
