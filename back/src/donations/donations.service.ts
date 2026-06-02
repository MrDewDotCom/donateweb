import { Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) { }

  create(createDonationDto: CreateDonationDto) {
    return this.prisma.donation.create({
      data: createDonationDto,
    });
  }

  findAll() {
    return this.prisma.donation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.donation.findUnique({
      where: { id },
    });
  }

  update(id: number, updateDonationDto: UpdateDonationDto) {
    return this.prisma.donation.update({
      where: { id },
      data: updateDonationDto,
    });
  }

  remove(id: number) {
    return this.prisma.donation.delete({
      where: { id },
    });
  }
}