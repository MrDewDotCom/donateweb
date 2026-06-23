import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
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

    // เช็คจำนวนเงินกับขั้นต่ำ/สูงสุดที่ตั้งไว้ใน Settings
    if (
      settings.minDonationAmount != null &&
      createDonationDto.amount < settings.minDonationAmount
    ) {
      throw new BadRequestException(
        `จำนวนเงินต้องไม่น้อยกว่า ${settings.minDonationAmount} บาท`,
      );
    }

    if (
      settings.maxDonationAmount != null &&
      createDonationDto.amount > settings.maxDonationAmount
    ) {
      throw new BadRequestException(
        `จำนวนเงินต้องไม่เกิน ${settings.maxDonationAmount} บาท`,
      );
    }

    const qrCode = await this.paymentService.generateQr(
      settings.promptpayNumber,
      createDonationDto.amount,
    );

    const donation = await this.prisma.donation.create({
      data: {
        ...createDonationDto,
        qrCode,
        accessToken: randomUUID(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // ลิงก์มีอายุ 15 นาทีจากตอนสร้าง
      },
    });

    return {
      id: donation.id,
      accessToken: donation.accessToken,
      status: donation.status,
      qrCode: donation.qrCode,
      expiresAt: donation.expiresAt, // เพิ่ม: frontend ใช้ทำตัวจับเวลา 15 นาที
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

  // คืนค่าเป็น state ที่ชัดเจน เพื่อให้ frontend รู้ว่าจะแสดงหน้าไหน:
  // - not_found  → ไม่มี donation นี้จริง (id/token ผิด)
  // - paid       → จ่ายแล้ว → แสดงหน้าขอบคุณ
  // - expired    → เกิน 15 นาทีจากตอนสร้างแล้วและยังไม่จ่าย → แสดงหน้า "ลิงก์หมดอายุ"
  // - active     → ยังใช้งานได้ → แสดงหน้า QR + Upload ตามปกติ
  async findByToken(id: number, token: string) {
    const donation = await this.prisma.donation.findFirst({
      where: {
        id,
        accessToken: token,
      },
    });

    if (!donation) {
      return { state: 'not_found' as const };
    }

    if (donation.status === 'paid') {
      return { state: 'paid' as const, donation: sanitizeDonation(donation) };
    }

    if (donation.expiresAt && donation.expiresAt.getTime() < Date.now()) {
      return { state: 'expired' as const };
    }

    return { state: 'active' as const, donation: sanitizeDonation(donation) };
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

  // สรุปยอดบริจาคที่จ่ายแล้วรายวัน ย้อนหลัง n วัน — ใช้ทำกราฟแท่งใน Dashboard
  async getDailyStats(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const donations = await this.prisma.donation.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: since },
      },
      select: { amount: true, paidAt: true },
    });

    // เตรียม bucket รายวันล่วงหน้า ให้วันที่ไม่มียอดก็โชว์เป็น 0 ไม่หายไปจากกราฟ
    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    for (const d of donations) {
      if (!d.paidAt) continue;
      const key = d.paidAt.toISOString().slice(0, 10);
      if (key in buckets) {
        buckets[key] += d.amount;
      }
    }

    return Object.entries(buckets).map(([date, total]) => ({ date, total }));
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