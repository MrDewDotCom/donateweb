import { ConflictException, Injectable } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { PrismaService } from 'prisma/src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { DonationsGateway } from './donations.gateway';
import { randomUUID } from 'crypto';
import { sanitizeDonation, sanitizeDonations } from 'src/common/utils/donation.util';
import { generateSignedUploadUrl } from 'src/common/utils/signed-url.util';

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

  // Admin-only (มี AdminApiKeyGuard คุมที่ controller) — เปลี่ยน slipImage เป็น signed URL หมดอายุ 15 นาที
  async findAll() {
    const donations = await this.prisma.donation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sanitizeDonations(donations).map((d) => ({
      ...d,
      slipImage: generateSignedUploadUrl(d.slipImage),
    }));
  }

  // Admin-only (มี AdminApiKeyGuard คุมที่ controller) — เปลี่ยน slipImage เป็น signed URL หมดอายุ 15 นาที
  async findOne(id: number) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
    });

    if (!donation) {
      return null;
    }

    const safe = sanitizeDonation(donation);
    return {
      ...safe,
      slipImage: generateSignedUploadUrl(safe.slipImage),
    };
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

  // เพิ่ม parameter transRef (optional) เพื่อบันทึก transaction reference จาก SlipOK
  // แก้ Race Condition: ใช้ updateMany พร้อม where status != 'paid'
  // เพื่อให้การเปลี่ยนสถานะเป็น atomic ที่ระดับ DB — ถ้ามี request 2 ตัว
  // วิ่งเข้ามาพร้อมกัน จะมีแค่ตัวแรกที่ update สำเร็จ (count === 1)
  // ตัวที่สองจะ update ไม่ได้เลย (count === 0) เพราะ status ถูกเปลี่ยนไปแล้ว
  async confirmPaymentFromSlip(
    id: number,
    slipImage: string,
    transRef?: string,
  ) {
    const result = await this.prisma.donation.updateMany({
      where: {
        id,
        status: { not: 'paid' }, // เงื่อนไขกันชน — เช็คและอัปเดตในคำสั่งเดียว
      },
      data: {
        slipImage,
        status: 'paid',
        paidAt: new Date(),
        transRef: transRef ?? null, // เก็บ transRef ไว้ใน DB
      },
    });

    if (result.count === 0) {
      // มี request อื่นที่ confirm สำเร็จไปก่อนแล้ว (ไม่ใช่ error ทั่วไป)
      throw new ConflictException('การบริจาคนี้ถูกยืนยันการชำระเงินไปแล้ว');
    }

    const donation = await this.prisma.donation.findUniqueOrThrow({
      where: { id },
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