import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCampaignDto {
    @IsString()
    title: string;

    @IsInt()
    @Min(1)
    goalAmount: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    // จำนวนคนที่จะแสดงใน Top Donators widget
    @IsOptional()
    @IsInt()
    @Min(1)
    topDonatorLimit?: number;

    // จำนวนรายการที่จะแสดงใน Recent Donations widget
    @IsOptional()
    @IsInt()
    @Min(1)
    recentLimit?: number;
}