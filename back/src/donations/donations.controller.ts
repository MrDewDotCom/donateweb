import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { AdminApiKeyGuard } from 'src/common/guards/admin-api-key.guard';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) { }

  // จำกัดการสร้าง donation: 10 ครั้ง / นาที ต่อ IP
  // ป้องกัน spam สร้าง donation ปลอม + เรียก generateQr รัวๆ
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationsService.create(createDonationDto);
  }

  @UseGuards(AdminApiKeyGuard)
  @Get()
  findAll() {
    return this.donationsService.findAll();
  }

  @Get("recent")
  getRecentDonations() {
    return this.donationsService
      .getRecentDonations();
  }

  @UseGuards(AdminApiKeyGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(+id);
  }

  // จำกัด admin action ที่กระทบ status โดยตรง: 20 ครั้ง / นาที
  // ป้องกัน brute-force admin key ผ่าน route ที่เปลี่ยนสถานะได้
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(AdminApiKeyGuard)
  @Patch(':id/mark-paid')
  markAsPaid(@Param('id') id: string) {
    return this.donationsService.markAsPaidByAdmin(+id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(AdminApiKeyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.donationsService.remove(+id);
  }

  // จำกัดการเช็ค token: 20 ครั้ง / นาที ต่อ IP
  // ป้องกัน brute-force เดา accessToken ของ donation คนอื่น
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(":id/:token")
  findByToken(
    @Param("id")
    id: string,

    @Param("token")
    token: string,
  ) {
    return this.donationsService
      .findByToken(
        +id,
        token,
      );
  }
}