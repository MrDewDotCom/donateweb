import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, } from 'class-validator';

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

    @IsOptional()
    @IsString()
    ttsVoice?: string;

    @IsOptional()
    @IsString()
    alertSound?: string;

    @IsOptional()
    @IsInt()
    alertVolume?: number;

    @IsOptional()
    @IsInt()
    overlayDuration?: number;

    promptpayNumber?: string;
}