import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DonationsService } from './donations.service';
import type { DonationSort } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

const DEFAULT_STATS_DAYS = 7;
const MIN_STATS_DAYS = 1;
const MAX_STATS_DAYS = 90;

function parseDays(raw?: string): number {
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_STATS_DAYS;
  }

  return Math.min(Math.max(Math.floor(parsed), MIN_STATS_DAYS), MAX_STATS_DAYS);
}

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) { }

  // จำกัดการสร้าง donation: 10 ครั้ง / นาที ต่อ IP
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationsService.create(createDonationDto);
  }

  // แบ่งหน้า + กรอง/ค้นหาที่ฝั่ง server — เดิมส่งทุกรายการที่เคยมีมากลับไปทั้งก้อน
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: DonationSort,
  ) {
    return this.donationsService.findAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      sort,
    });
  }

  // ยอดรวมทั้งระบบ — แยกจาก findAll เพราะรายการถูกแบ่งหน้าแล้ว
  @UseGuards(JwtAuthGuard)
  @Get('stats/summary')
  getSummary() {
    return this.donationsService.getSummary();
  }

  @Get("recent")
  getRecentDonations() {
    return this.donationsService
      .getRecentDonations();
  }

  // สรุปยอดโดเนทรายวัน (default 7 วันล่าสุด) — ใช้ทำกราฟใน Dashboard
  //
  // เดิมใช้ Number(days) ดิบๆ: ?days=abc ได้ NaN แล้ววนลูปไม่ครบ กราฟว่างเปล่าโดยไม่มี error
  // ส่วน ?days=1000000 สร้าง Date กับ bucket เป็นล้านอัน
  // ตรงนี้ตั้งใจให้ค่าที่ใช้ไม่ได้ตกกลับไปใช้ค่า default แทนที่จะโยน error
  // เพราะเป็นแค่กราฟในหน้า Dashboard ไม่ควรทำให้ทั้งหน้าพังเพราะ query string เพี้ยน
  @UseGuards(JwtAuthGuard)
  @Get("stats/daily")
  getDailyStats(@Query("days") days?: string) {
    return this.donationsService.getDailyStats(parseDays(days));
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