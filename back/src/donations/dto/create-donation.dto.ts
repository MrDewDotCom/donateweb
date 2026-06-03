import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDonationDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsInt()
    @Min(1)
    amount!: number;
}