import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const DONATION_TYPES = ['standard', 'timer', 'video'] as const;
export type DonationType = (typeof DONATION_TYPES)[number];

export class CreateDonationDto {
    @IsString()
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;

    @IsInt()
    @Min(1)
    @Max(1_000_000)
    amount!: number;

    // ไม่ส่งมา = standard
    @IsOptional()
    @IsIn(DONATION_TYPES)
    type?: DonationType;

    // ---- โดเนทคลิป (type = video) ----
    @IsOptional()
    @IsString()
    @MaxLength(300)
    videoUrl?: string;

    // เริ่มที่วินาทีที่เท่าไหร่ (ไม่ส่ง = อ่านจาก ?t= ในลิงก์ หรือ 0)
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(43200)
    videoStart?: number;

    // true (ค่าเริ่มต้น) = มี alert เสียง+TTS ก่อนเล่นคลิป, false = เล่นคลิปอย่างเดียว
    @IsOptional()
    @IsBoolean()
    videoAlert?: boolean;
}