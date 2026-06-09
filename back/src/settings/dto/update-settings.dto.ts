import { IsBoolean, IsNumber, IsOptional, } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsNumber()
    topDonatorsLimit?: number;

    @IsOptional()
    @IsNumber()
    refreshInterval?: number;

    @IsOptional()
    @IsBoolean()
    soundEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    ttsEnabled?: boolean;
}