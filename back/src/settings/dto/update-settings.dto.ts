import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const OVERLAY_ANIMATIONS = ['fade', 'slide', 'zoom', 'bounce'] as const;

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

    @IsOptional()
    @IsString()
    promptpayNumber?: string;

    // Payment
    @IsOptional()
    @IsInt()
    @Min(0)
    minDonationAmount?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxDonationAmount?: number;

    // Overlay
    @IsOptional()
    @IsIn(OVERLAY_ANIMATIONS)
    overlayAnimation?: string;

    @IsOptional()
    @IsString()
    overlayImage?: string;

    // Sound & TTS
    @IsOptional()
    @IsBoolean()
    readMessageEnabled?: boolean;

    // Donation Goal
    @IsOptional()
    @IsInt()
    @Min(1)
    monthlyGoalAmount?: number;

    @IsOptional()
    @IsBoolean()
    monthlyGoalAutoReset?: boolean;
}