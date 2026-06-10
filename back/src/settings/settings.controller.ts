import { Body, Controller, Get, Patch, } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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

    @Patch()
    updateSettings(
        @Body()
        updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(updateSettingsDto,);
    }

    @Get()
    getSetting() {
        return this.settingsService.getSettings();
    }

    @Patch()
    updateSetting(
        @Body()
        dto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(
            dto,
        );
    }
}