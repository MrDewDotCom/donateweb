import { Body, Controller, Get, Patch, UseGuards, } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AdminApiKeyGuard } from 'src/common/guards/admin-api-key.guard';

@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService:
            SettingsService,
    ) { }

    @Get()
    getSettings() {
        return this.settingsService.getSettings();
    }

    @UseGuards(AdminApiKeyGuard)
    @Patch()
    updateSettings(
        @Body()
        updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(updateSettingsDto,);
    }
}
