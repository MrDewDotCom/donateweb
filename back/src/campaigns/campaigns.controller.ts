import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

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

    @Patch(':id')
    updateCampaign(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        return this.campaignsService
            .updateCampaign(+id, body);
    }
}