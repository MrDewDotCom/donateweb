import { Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { DonationsGateway } from './donations.gateway';
import { randomUUID } from 'crypto';
import { sanitizeDonation, sanitizeDonations } from 'src/common/utils/donation.util';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private donationsGateway: DonationsGateway,
  ) { }

  async create(createDonationDto: CreateDonationDto) {
    const settings = await this.prisma.setting.findFirst();

    if (!settings?.promptpayNumber) {
      throw new Error('PromptPay number not configured');
    }

    const qrCode = await this.paymentService.generateQr(
      settings.promptpayNumber,
      createDonationDto.amount,
    );

    const donation = await this.prisma.donation.create({
      data: { ...createDonationDto, qrCode, accessToken: randomUUID() },
    });

    return {
      id: donation.id,
      accessToken: donation.accessToken,
      status: donation.status,
      qrCode: donation.qrCode,
    };
  }

  async findAll() {
    const donations = await this.prisma.donation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sanitizeDonations(donations);
  }

  async findOne(id: number) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
    });

    if (!donation) {
      return null;
    }

    return sanitizeDonation(donation);
  }

  async findByToken(id: number, token: string) {
    const donation = await this.prisma.donation.findFirst({
      where: {
        id,
        accessToken: token,
      },
    });

    if (!donation) {
      return null;
    }

    return sanitizeDonation(donation);
  }

  async confirmPaymentFromSlip(
    id: number,
    slipImage: string,
    transRef?: string,
  ) {
    const donation = await this.prisma.donation.update({
      where: { id },
      data: {
        slipImage,
        status: 'paid',
        paidAt: new Date(),
        transRef: transRef ?? null,
      },
    });

    this.donationsGateway.emitDonationPaid(donation);

    return sanitizeDonation(donation);
  }

  async markAsPaidByAdmin(id: number) {
    const existing = await this.prisma.donation.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === 'paid') {
      return sanitizeDonation(existing);
    }

    const donation = await this.prisma.donation.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    this.donationsGateway.emitDonationPaid(donation);

    return sanitizeDonation(donation);
  }

  remove(id: number) {
    return this.prisma.donation.delete({
      where: { id },
    });
  }

  async getRecentDonations() {
    const donations = await this.prisma.donation.findMany({
      where: {
        status: 'paid',
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: 5,
    });

    return sanitizeDonations(donations);
  }
}