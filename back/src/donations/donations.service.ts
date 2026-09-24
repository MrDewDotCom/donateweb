import { ConflictException, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { DonationsGateway } from './donations.gateway';
import { randomUUID } from 'crypto';
import { sanitizeDonation, sanitizeDonations, toPublicDonation } from 'src/common/utils/donation.util';
import { generateSignedUploadUrl } from 'src/common/utils/signed-url.util';
import { TtsService } from 'src/tts/tts.service';
import { addDays, startOfDayDaysAgo, toDateKey } from 'src/common/utils/date.util';
import { Donation, Prisma, Setting } from '@prisma/client';
import { TimerService, secondsForAmount } from 'src/timer/timer.service';
import { VideoService, videoSecondsForAmount } from 'src/video/video.service';
import { fetchYouTubeTitle, parseYouTubeId, parseYouTubeStart } from 'src/video/youtube.util';

export type DonationSort = 'newest' | 'oldest' | 'amount';

export interface FindAllDonationsOptions {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  sort?: DonationSort;
}

const DONATION_ORDER_BY: Record<DonationSort, Prisma.DonationOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  amount: { amount: 'desc' },
};

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private donationsGateway: DonationsGateway,
    private ttsService: TtsService,
    private timerService: TimerService,
    private videoService: VideoService,
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

    // โดเนทจับเวลา: ต้องเปิดใช้งานใน Settings + ผ่านขั้นต่ำเฉพาะของมัน
    // คำนวณเวลาตอนนี้เลยตามเรทปัจจุบัน แล้วเก็บไว้กับรายการ
    const type = createDonationDto.type ?? 'standard';
    let timerSeconds: number | null = null;

    if (type === 'timer') {
      if (!settings.timerEnabled) {
        throw new BadRequestException('ตอนนี้ยังไม่เปิดรับโดเนทจับเวลา');
      }

      if (
        settings.timerMinAmount != null &&
        createDonationDto.amount < settings.timerMinAmount
      ) {
        throw new BadRequestException(
          `โดเนทจับเวลาขั้นต่ำ ${settings.timerMinAmount} บาท`,
        );
      }

      timerSeconds = secondsForAmount(
        createDonationDto.amount,
        settings.timerRateAmount,
        settings.timerRateMinutes,
      );

      if (timerSeconds < 1) {
        throw new BadRequestException('ยอดนี้น้อยเกินไป ได้เวลาไม่ถึง 1 วินาที');
      }
    }

    // โดเนทคลิป: ตรวจลิงก์ YouTube + คำนวณเวลาเล่นตามเรทตอนนี้
    let video: {
      videoId: string;
      videoTitle: string | null;
      videoStart: number;
      videoSeconds: number;
      videoAlert: boolean;
    } | null = null;

    if (type === 'video') {
      if (!settings.videoEnabled) {
        throw new BadRequestException('ตอนนี้ยังไม่เปิดรับโดเนทคลิป');
      }

      if (settings.videoMinAmount != null && createDonationDto.amount < settings.videoMinAmount) {
        throw new BadRequestException(`โดเนทคลิปขั้นต่ำ ${settings.videoMinAmount} บาท`);
      }

      const url = createDonationDto.videoUrl ?? '';
      const videoId = parseYouTubeId(url);
      if (!videoId) {
        throw new BadRequestException('ลิงก์ไม่ถูกต้อง — รองรับเฉพาะลิงก์ YouTube');
      }

      let title: string | null;
      try {
        title = await fetchYouTubeTitle(videoId);
      } catch {
        throw new BadRequestException('ตรวจสอบคลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
      if (title === null) {
        throw new BadRequestException('เปิดคลิปนี้ไม่ได้ — คลิปอาจถูกลบ เป็นส่วนตัว หรือไม่อนุญาตให้ฝัง');
      }

      const videoSeconds = videoSecondsForAmount(
        createDonationDto.amount,
        settings.videoRateAmount,
        settings.videoRateSeconds,
        settings.videoMaxSeconds,
      );
      if (videoSeconds < 1) {
        throw new BadRequestException('ยอดนี้น้อยเกินไป ได้เวลาเล่นไม่ถึง 1 วินาที');
      }

      video = {
        videoId,
        videoTitle: title || null,
        videoStart: createDonationDto.videoStart ?? parseYouTubeStart(url) ?? 0,
        videoSeconds,
        videoAlert: createDonationDto.videoAlert ?? true,
      };
    }

    const qrCode = await this.paymentService.generateQr(
      settings.promptpayNumber,
      createDonationDto.amount,
    );

    // videoUrl/videoStart ไม่ใช่คอลัมน์ใน DB — แยกออกก่อนบันทึก
    const {
      videoUrl: _videoUrl,
      videoStart: _videoStart,
      videoAlert: _videoAlert,
      ...donationData
    } = createDonationDto;

    const donation = await this.prisma.donation.create({
      data: {
        ...donationData,
        type,
        timerSeconds,
        ...(video ?? {}),
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
      type: donation.type,
      timerSeconds: donation.timerSeconds,
      videoId: donation.videoId,
      videoTitle: donation.videoTitle,
      videoSeconds: donation.videoSeconds,
    };
  }

  // Admin-only (มี JwtAuthGuard คุมที่ controller) — เปลี่ยน slipImage เป็น signed URL หมดอายุ 15 นาที
  //
  // เดิมดึงทุกรายการที่เคยมีมาทั้งหมดในครั้งเดียว แล้วคำนวณ HMAC ต่อแถว
  // ยิ่งโดเนทเยอะ payload ยิ่งโต จนหน้า Dashboard ค้างในที่สุด
  // ตอนนี้แบ่งหน้า + ให้กรอง/ค้นหาที่ระดับ DB (มี index รองรับแล้ว)
  async findAll(options: FindAllDonationsOptions = {}) {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const skip = Math.max(options.offset ?? 0, 0);

    const where: Prisma.DonationWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        orderBy: DONATION_ORDER_BY[options.sort ?? 'newest'],
        take,
        skip,
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      items: sanitizeDonations(donations).map((d) => ({
        ...d,
        slipImage: generateSignedUploadUrl(d.slipImage),
      })),
      total,
      limit: take,
      offset: skip,
    };
  }

  // ยอดรวมทั้งระบบสำหรับการ์ดสถิติในหน้า Dashboard
  // ต้องแยกออกมาเป็น endpoint ต่างหาก เพราะพอ findAll แบ่งหน้าแล้ว
  // จะเอาข้อมูลหน้าเดียวมาบวกเป็นยอดรวมไม่ได้อีก
  async getSummary() {
    const [paid, totalCount] = await Promise.all([
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: 'paid' },
      }),
      this.prisma.donation.count(),
    ]);

    return {
      totalAmount: paid._sum.amount ?? 0,
      paidCount: paid._count,
      totalCount,
    };
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

  // สร้างข้อความสำหรับอ่านออกเสียงและ generate ไฟล์เสียงด้วย Edge TTS
  // ย้าย logic นี้มาจาก frontend (เดิมตัดสินใจตอน play ด้วย Web Speech API)
  // เพราะตอนนี้ต้อง generate ไฟล์ล่วงหน้าตั้งแต่ฝั่ง backend
  // คืน null ถ้า TTS ปิดอยู่ใน settings หรือ generate ไม่สำเร็จ
  private async generateTtsForDonation(
    donation: Donation,
    settings: Setting | null,
  ): Promise<string | null> {
    if (!settings?.ttsEnabled) {
      return null;
    }

    const displayMessage = sanitizeDonation(donation).displayMessage;
    const shouldReadMessage =
      settings.readMessageEnabled && donation.message?.trim();

    const textToSpeak = shouldReadMessage
      ? (displayMessage ?? donation.message)!
      : `${donation.name} บริจาค ${donation.amount} บาท`;

    return this.ttsService.generate(textToSpeak);
  }

  // ประกาศโดเนทไปที่ Overlay — ตั้งใจให้เรียกแบบ "ไม่ await" จาก flow การชำระเงิน
  //
  // เหตุผล: TTS ต้อง spawn Python แล้วยิงไป Edge TTS ของ Microsoft ซึ่งอาจช้าหลายวินาที
  // ถ้า await ไว้ใน request ของผู้บริจาค เขาจะค้างรออยู่หน้าจอโดยไม่จำเป็น
  // ทั้งที่เงินเข้าและบันทึกลง DB เรียบร้อยแล้ว
  //
  // ไม่ throw ออกไปข้างนอกเด็ดขาด (caller ไม่ได้ await จึงไม่มีใครรับ) และต้อง emit
  // ให้ overlay เสมอ แม้ TTS จะพัง — เสียงหายดีกว่าโดเนทไม่ขึ้นจอ
  private async announceDonation(donation: Donation): Promise<void> {
    // โดเนทจับเวลา: เพิ่มเวลาเข้าตัวจับเวลาบนไลฟ์ (เริ่มเดินอัตโนมัติ)
    // ทำก่อน TTS เพื่อให้เวลาขึ้นจอทันที — addFromDonation ไม่ throw
    if (donation.type === 'timer' && donation.timerSeconds) {
      await this.timerService.addFromDonation(donation.id, donation.timerSeconds);
    }

    // โดเนทคลิป: เข้าคิวเล่นบนไลฟ์ (เริ่มหลัง alert ตามเวลาที่ตั้งไว้) — enqueue ไม่ throw
    if (donation.type === 'video' && donation.videoId) {
      await this.videoService.enqueue(donation.id);
    }

    // โดเนทคลิปแบบ "เล่นคลิปอย่างเดียว": ไม่มีเสียงแจ้งเตือน/TTS
    // ยัง emit donationPaid (silent) เพื่อให้ widget ยอด/อันดับอัปเดต แต่ overlay alert จะข้ามไป
    if (donation.type === 'video' && donation.videoAlert === false) {
      try {
        this.donationsGateway.emitDonationPaid(donation, null, true);
      } catch (error) {
        this.logger.error(`Failed to emit donationPaid for donation ${donation.id}`, error as Error);
      }
      return;
    }

    let ttsAudioUrl: string | null = null;

    try {
      const settings = await this.prisma.setting.findFirst();
      ttsAudioUrl = await this.generateTtsForDonation(donation, settings);
    } catch (error) {
      this.logger.error(
        `TTS generation failed for donation ${donation.id} — emitting without audio`,
        error as Error,
      );
    }

    try {
      this.donationsGateway.emitDonationPaid(donation, ttsAudioUrl);
    } catch (error) {
      this.logger.error(
        `Failed to emit donationPaid for donation ${donation.id}`,
        error as Error,
      );
    }
  }

  // เพิ่ม parameter transRef (optional) เพื่อบันทึก transaction reference จาก SlipOK
  // แก้ Race Condition: ใช้ updateMany พร้อม where status != 'paid'
  // เพื่อให้การเปลี่ยนสถานะเป็น atomic ที่ระดับ DB — ถ้ามี request 2 ตัว
  // วิ่งเข้ามาพร้อมกัน จะมีแค่ตัวแรกที่ update สำเร็จ (count === 1)
  // ตัวที่สองจะ update ไม่ได้เลย (count === 0) เพราะ status ถูกเปลี่ยนไปแล้ว
  //
  // สำคัญ: method นี้ "ไม่" รับ slipImage แล้ว — ต้องถูกเรียกทันทีที่ SlipOK ตรวจผ่าน
  // โดยยังไม่ต้องรอเขียนไฟล์รูป เพราะ ณ จุดที่ SlipOK ตอบ success คือเงินเข้าจริงแล้ว
  // และ SlipOK ได้ mark สลิปใบนั้นว่าถูกใช้ไปแล้ว (ยิงซ้ำจะโดน error 1012 DUPLICATE_SLIP)
  // ถ้ามีอะไรพังก่อนบันทึกลง DB ผู้บริจาคจะจ่ายเงินฟรีโดยไม่มีหลักฐานเหลืออยู่เลย
  // รูปสลิปเป็นแค่หลักฐานประกอบ ค่อยแนบทีหลังด้วย attachSlipImage()
  async confirmPaymentFromSlip(id: number, transRef?: string) {
    let result: { count: number };

    try {
      result = await this.prisma.donation.updateMany({
        where: {
          id,
          status: { not: 'paid' }, // เงื่อนไขกันชน — เช็คและอัปเดตในคำสั่งเดียว
        },
        data: {
          status: 'paid',
          paidAt: new Date(),
          transRef: transRef ?? null, // เก็บ transRef ไว้ใน DB
        },
      });
    } catch (error) {
      // P2002 = ชน unique constraint ของ transRef → สลิปใบนี้เคยถูกใช้ยืนยันไปแล้ว
      // ปกติ SlipOK ควรดักให้ก่อน (error 1012) แต่เราต้องมีด่านของตัวเองด้วย
      // ไม่ให้ต้องพึ่ง service ภายนอกอย่างเดียว
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Rejected duplicate slip for donation ${id} — transRef=${transRef ?? 'unknown'} already used`,
        );
        throw new ConflictException('สลิปใบนี้ถูกใช้ยืนยันการชำระเงินไปแล้ว');
      }

      throw error;
    }

    if (result.count === 0) {
      // มี request อื่นที่ confirm สำเร็จไปก่อนแล้ว (ไม่ใช่ error ทั่วไป)
      throw new ConflictException('การบริจาคนี้ถูกยืนยันการชำระเงินไปแล้ว');
    }

    const donation = await this.prisma.donation.findUniqueOrThrow({
      where: { id },
    });

    this.logger.log(
      `Donation ${id} confirmed paid — amount=${donation.amount} transRef=${transRef ?? 'none'}`,
    );

    // ไม่ await: ผู้บริจาคไม่ควรต้องรอ TTS generate เสร็จก่อนถึงจะได้ response
    void this.announceDonation(donation);

    return sanitizeDonation(donation);
  }

  // แนบรูปสลิปเข้ากับ donation ที่ยืนยันการชำระเงินไปแล้ว
  // แยกออกมาจาก confirmPaymentFromSlip เพื่อให้การบันทึก "จ่ายแล้ว" ลง DB
  // ไม่ต้องขึ้นกับว่าเขียนไฟล์ลงดิสก์สำเร็จหรือไม่
  async attachSlipImage(id: number, slipImage: string) {
    await this.prisma.donation.update({
      where: { id },
      data: { slipImage },
    });
  }

  // ใช้ updateMany แบบเดียวกับ confirmPaymentFromSlip — เดิมเป็น read-then-write
  // ซึ่งถ้า admin กดปุ่มพร้อมกับที่ผู้บริจาคอัปโหลดสลิปเข้ามาพอดี ทั้งสองทางจะผ่าน
  // การเช็คของตัวเอง แล้ว emit ขึ้น overlay ซ้ำสองครั้ง + ทับ paidAt ของกันและกัน
  async markAsPaidByAdmin(id: number) {
    const existing = await this.prisma.donation.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const result = await this.prisma.donation.updateMany({
      where: {
        id,
        status: { not: 'paid' }, // เช็คและอัปเดตในคำสั่งเดียว
      },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    if (result.count === 0) {
      // มีคนยืนยันไปก่อนแล้ว — ไม่ต้อง emit ซ้ำ คืนสถานะล่าสุดไปเฉยๆ
      const current = await this.prisma.donation.findUniqueOrThrow({ where: { id } });
      return sanitizeDonation(current);
    }

    const donation = await this.prisma.donation.findUniqueOrThrow({
      where: { id },
    });

    this.logger.log(`Donation ${id} marked paid by admin — amount=${donation.amount}`);

    void this.announceDonation(donation);

    return sanitizeDonation(donation);
  }

  remove(id: number) {
    return this.prisma.donation.delete({
      where: { id },
    });
  }

  // สรุปยอดบริจาคที่จ่ายแล้วรายวัน ย้อนหลัง n วัน — ใช้ทำกราฟแท่งใน Dashboard
  //
  // เดิมกรองด้วยเที่ยงคืนเวลาเครื่อง แต่จัดกลุ่มด้วย toISOString() ซึ่งเป็น UTC
  // สองอันนี้ไม่ใช่ "วัน" เดียวกัน ทำให้โดเนทช่วง 00:00-07:00 ตามเวลาไทย
  // ไปนับรวมกับวันก่อนหน้า หรือหลุดออกนอก bucket จนไม่ถูกนับเลย
  // ตอนนี้ทั้งขอบเขตและคีย์ใช้เวลาไทยเหมือนกันหมด
  async getDailyStats(days = 7) {
    const since = startOfDayDaysAgo(days - 1);

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
      buckets[toDateKey(addDays(since, i))] = 0;
    }

    for (const d of donations) {
      if (!d.paidAt) continue;
      const key = toDateKey(d.paidAt);
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

    // endpoint สาธารณะ — ส่งเฉพาะข้อมูลที่แสดงได้
    return donations.map(toPublicDonation);
  }
}
