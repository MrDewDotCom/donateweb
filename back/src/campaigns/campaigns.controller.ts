import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CampaignsService } from './campaigns.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
    constructor(
        private readonly campaignsService:
            CampaignsService,
    ) { }

    @Get('active')
    getActiveCampaign() {
        return this.campaignsService
            .getActiveCampaign();
    }

    @Get("active/progress")
    getCampaignProgress() {
        return this.campaignsService
            .getCampaignProgress();
    }

    @Get("active/top-donators")
    getTopDonators() {
        return this.campaignsService
            .getTopDonators();
    }

    @Get('active/recent')
    getRecentDonations() {
        return this.campaignsService
            .getRecentDonations();
    }

    // สร้างแคมเปญ (Goal) ใหม่ — admin เท่านั้น
    @Throttle({ default: { limit: 2, ttl: 60000 } })
    @UseGuards(JwtAuthGuard)
    @Post()
    createCampaign(@Body() body: CreateCampaignDto) {
        return this.campaignsService.createCampaign(body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    updateCampaign(
        @Param('id') id: string,
        @Body() body: UpdateCampaignDto,
    ) {
        return this.campaignsService
            .updateCampaign(+id, body);
    }
}