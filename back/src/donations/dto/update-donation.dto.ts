import { IsOptional, IsString } from 'class-validator';

export class UpdateDonationDto {
    @IsOptional()
    @IsString()
    status?: string;
}