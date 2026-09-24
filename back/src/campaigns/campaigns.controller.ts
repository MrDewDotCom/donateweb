import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CampaignsService } from './campaigns.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// แปลง ?limit= เป็นตัวเลข 1-20 (กันคนขอทีละเยอะ ๆ) — ค่าผิดรูปแบบ = undefined
function parseLimit(raw?: string): number | undefined {
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1) return undefined;
    return Math.min(n, 20);
}

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

    // ?limit= (1-20) ไม่ส่งมา = ใช้ค่าที่ตั้งไว้ใน campaign/settings ตามเดิม
    @Get("active/top-donators")
    getTopDonators(@Query('limit') limit?: string) {
        return this.campaignsService
            .getTopDonators(parseLimit(limit));
    }

    @Get('active/recent')
    getRecentDonations(@Query('limit') limit?: string) {
        return this.campaignsService
            .getRecentDonations(parseLimit(limit));
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