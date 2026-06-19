import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCampaignDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    goalAmount?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    topDonatorLimit?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    recentLimit?: number;
}
