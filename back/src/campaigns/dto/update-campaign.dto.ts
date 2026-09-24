import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCampaignDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    goalAmount?: number;

    // เดิมไม่มีสองฟิลด์นี้ ทั้งที่หน้า Settings ส่งมาทุกครั้งที่กดบันทึก
    // ValidationPipe (whitelist: true) จึงตัดทิ้งเงียบๆ แล้วตอบ 200
    // → admin แก้ช่วงวันแคมเปญแล้วเห็นว่า "บันทึกแล้ว" ทั้งที่ไม่มีอะไรเปลี่ยน
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

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
