import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const OVERLAY_ANIMATIONS = ['fade', 'slide', 'zoom', 'bounce'] as const;
const TOP_DONATOR_MODES = ['all', 'campaign', 'custom'] as const;

export class UpdateSettingsDto {
    // ---- Alert text colors (#rrggbb) ----
    @IsOptional()
    @Matches(HEX_COLOR, { message: 'สีต้องเป็นรูปแบบ #rrggbb' })
    alertNameColor?: string;

    @IsOptional()
    @Matches(HEX_COLOR, { message: 'สีต้องเป็นรูปแบบ #rrggbb' })
    alertAmountColor?: string;

    @IsOptional()
    @Matches(HEX_COLOR, { message: 'สีต้องเป็นรูปแบบ #rrggbb' })
    alertMessageColor?: string;

    // ---- Video clip donation ----
    @IsOptional()
    @IsBoolean()
    videoEnabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    videoRateAmount?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    videoRateSeconds?: number;

    // null = ใช้ขั้นต่ำทั่วไป
    @IsOptional()
    @IsInt()
    @Min(1)
    videoMinAmount?: number | null;

    @IsOptional()
    @IsInt()
    @Min(5)
    videoMaxSeconds?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    videoStartDelay?: number;

    // ---- Timer donation ----
    @IsOptional()
    @IsBoolean()
    timerEnabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    timerRateAmount?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    timerRateMinutes?: number;

    // null = ใช้ขั้นต่ำทั่วไป
    @IsOptional()
    @IsInt()
    @Min(1)
    timerMinAmount?: number | null;

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

    @IsOptional()
    @IsBoolean()
    goalEffectEnabled?: boolean;

    // Top Donators
    @IsOptional()
    @IsIn(TOP_DONATOR_MODES)
    topDonatorMode?: string;

    // รับเป็น "YYYY-MM-DD" จาก <input type="date"> — service จะขยายเป็นต้นวัน/ท้ายวัน
    // ตามเวลาไทยให้เอง ส่ง null มาเพื่อล้างค่าได้
    @IsOptional()
    @IsDateString()
    topDonatorFrom?: string | null;

    @IsOptional()
    @IsDateString()
    topDonatorTo?: string | null;
}