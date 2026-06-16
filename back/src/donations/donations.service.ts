import { Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { DonationsGateway } from './donations.gateway';
import { randomUUID } from "crypto";

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private donationsGateway: DonationsGateway,
  ) { }

  async create(createDonationDto: CreateDonationDto) {
    const settings =
      await this.prisma.setting.findFirst();

    if (!settings?.promptpayNumber) {
      throw new Error(
        "PromptPay number not configured",
      );
    }

    const qrCode =
      await this.paymentService.generateQr(
        settings.promptpayNumber,
        createDonationDto.amount,
      );

    const donation =
      await this.prisma.donation.create({
        data: { ...createDonationDto, qrCode, accessToken: randomUUID(), },
      });

    console.log(donation);

    return {
      id: donation.id,
      accessToken: donation.accessToken,
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

  async findByToken(
    id: number,
    token: string,
  ) {
    return this.prisma.donation.findFirst({
      where: {
        id,
        accessToken:
          token,
      },
    });
  }

  async update(
    id: number,
    updateDonationDto: UpdateDonationDto,
  ) {
    const data: any = {
      ...updateDonationDto,
    };

    if (updateDonationDto.status === 'paid') {
      data.paidAt = new Date();
    }

    const donation =
      await this.prisma.donation.update({
        where: { id },
        data,
      });

    if (donation.status === 'paid') {
      console.log(
        'EMIT:',
        donation.id,
        donation.name,
      );

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

  async getRecentDonations() {
    return this.prisma.donation.findMany({
      where: {
        status: "paid",
      },

      orderBy: {
        paidAt: "desc",
      },

      take: 5,
    });
  }
}