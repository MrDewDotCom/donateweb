import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}