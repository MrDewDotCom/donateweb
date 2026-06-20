import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) { }

  // จำกัดการสร้าง donation: 10 ครั้ง / นาที ต่อ IP
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationsService.create(createDonationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.donationsService.findAll();
  }

  @Get("recent")
  getRecentDonations() {
    return this.donationsService
      .getRecentDonations();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(+id);
  }

  // จำกัด admin action ที่กระทบ status โดยตรง: 20 ครั้ง / นาที
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-paid')
  markAsPaid(@Param('id') id: string) {
    return this.donationsService.markAsPaidByAdmin(+id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.donationsService.remove(+id);
  }

  // จำกัดการเช็ค token: 20 ครั้ง / นาที ต่อ IP
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