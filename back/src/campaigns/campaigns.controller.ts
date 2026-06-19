import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AdminApiKeyGuard } from 'src/common/guards/admin-api-key.guard';

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

    @UseGuards(AdminApiKeyGuard)
    @Patch(':id')
    updateCampaign(
        @Param('id') id: string,
        @Body() body: UpdateCampaignDto,
    ) {
        return this.campaignsService
            .updateCampaign(+id, body);
    }
}
