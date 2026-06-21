import { Body, Controller, Get, Patch, UseGuards, } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

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

    // public — ใช้แสดงผลความคืบหน้าเป้าหมายรายเดือน (ถ้าทำ widget ต่อในอนาคต)
    @Get('monthly-goal')
    getMonthlyGoalProgress() {
        return this.settingsService.getMonthlyGoalProgress();
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    updateSettings(
        @Body()
        updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(updateSettingsDto,);
    }
}