import { Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { DonationsGateway } from './donations.gateway';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private donationsGateway: DonationsGateway,
  ) { }

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

  async update(
    id: number,
    updateDonationDto: UpdateDonationDto,
  ) {
    const donation =
      await this.prisma.donation.update({
        where: { id },
        data: updateDonationDto,
      });

    if (donation.status === 'paid') {
      this.donationsGateway.emitDonationPaid(
        donation,
      );
    }

    return donation;
  }

  remove(id: number) {
    return this.prisma.donation.delete({
      where: { id },
    });
  }
}