import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { AdminApiKeyGuard } from 'src/common/guards/admin-api-key.guard';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) { }

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

  @UseGuards(AdminApiKeyGuard)
  @Patch(':id/mark-paid')
  markAsPaid(@Param('id') id: string) {
    return this.donationsService.markAsPaidByAdmin(+id);
  }

  @UseGuards(AdminApiKeyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.donationsService.remove(+id);
  }

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
