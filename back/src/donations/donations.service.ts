import { Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,) { }

  async create(createDonationDto: CreateDonationDto) {
    const qrCode = await this.paymentService.generateQRCode(
      process.env.PROMPTPAY_PHONE!,
      createDonationDto.amount,
    );

    const donation = await this.prisma.donation.create({
      data: {
        ...createDonationDto,
        qrCode,
      },
    });

    console.log(donation);

    return {
      id: donation.id,
      status: donation.status,
      qrCode: donation.qrCode,
    };
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