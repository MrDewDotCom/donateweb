import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Logger,
    NotFoundException,
    Post,
    UploadedFile,
    UseInterceptors,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { SlipokService } from "src/slipok/slipok.service";
import { SlipOkVerificationException } from "src/slipok/exceptions/slipok.exception";
import { DonationsService } from "./donations.service";
import { isValidImageBuffer, safeUploadFilename } from "src/common/utils/donation.util";

const UPLOADS_DIR = path.resolve("./uploads");

@Controller("upload")
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(
        private readonly slipokService: SlipokService,
        private readonly donationsService: DonationsService,
    ) {
        // สร้างโฟลเดอร์ตั้งแต่ตอน start เหมือนที่ TtsService/SettingsService ทำ
        // ถ้ารอไปสร้างตอน request แล้วมันไม่มี จะพังหลัง SlipOK ตรวจสลิปไปแล้ว
        // ซึ่งเป็นจังหวะที่แย่ที่สุด (เงินเข้าแล้วแต่บันทึกไม่ได้)
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
    }

    // จำกัดเข้มสุดในระบบ: 5 ครั้ง / นาที ต่อ IP
    // เพราะทุกครั้งที่ผ่าน endpoint นี้คือยิง SlipOK API จริง (มี quota จำกัด/เสียเงิน)
    // และยังป้องกัน brute-force donationId+token คู่กันไปด้วย
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post()
    @UseInterceptors(
        FileInterceptor("file", {
            storage: memoryStorage(),
        }),
    )
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body("donationId") donationId: string,
        @Body("token") token: string,
    ) {
        if (!donationId || !token) {
            throw new BadRequestException("ต้องระบุ donationId และ token");
        }

        if (!isValidImageBuffer(file.buffer)) {
            throw new BadRequestException("ไฟล์ไม่ใช่รูปภาพที่รองรับ");
        }

        const donationState = await this.donationsService.findByToken(
            Number(donationId),
            token,
        );

        if (donationState.state === "not_found") {
            throw new NotFoundException("ไม่พบข้อมูลการบริจาค");
        }

        if (donationState.state === "paid") {
            throw new BadRequestException("การบริจาคนี้ชำระเงินแล้ว");
        }

        if (donationState.state === "expired") {
            throw new BadRequestException("ลิงก์หมดอายุแล้ว กรุณาสร้างการบริจาคใหม่");
        }

        const donation = donationState.donation;

        // ---------- 1) ตรวจสลิปกับ SlipOK ----------
        // ทุกอย่างก่อนบรรทัดนี้ยังยกเลิกได้ฟรี — หลังจากนี้ยกเลิกไม่ได้แล้ว
        let transRef: string | undefined;

        try {
            const slipResult = await this.slipokService.checkSlip({
                fileBuffer: file.buffer,
                fileName: file.originalname,
                amount: donation.amount,
            });

            transRef = slipResult.transRef;
        } catch (err) {
            if (err instanceof SlipOkVerificationException) {
                throw new BadRequestException({
                    code: err.code,
                    message: err.message,
                });
            }
            throw err;
        }

        // ---------- 2) บันทึกลง DB ทันที ----------
        // จุดนี้เงินเข้าบัญชีจริงแล้ว และ SlipOK ได้ mark สลิปใบนี้ว่าถูกใช้ไปแล้ว
        // ผู้บริจาคจะยิงสลิปใบเดิมซ้ำไม่ได้อีก (จะโดน 1012 DUPLICATE_SLIP)
        // ดังนั้นต้องบันทึกให้ลงก่อนเป็นอันดับแรก ห้ามมีอะไรมาคั่นก่อนหน้านี้
        let updated: Awaited<ReturnType<DonationsService["confirmPaymentFromSlip"]>>;

        try {
            updated = await this.donationsService.confirmPaymentFromSlip(
                donation.id,
                transRef,
            );
        } catch (err) {
            if (err instanceof ConflictException) {
                // มีคน confirm ไปก่อนแล้ว — ไม่ใช่เงินหาย ปล่อยผ่านตามเดิม
                throw err;
            }

            // เคสร้ายแรงที่สุดในระบบ: จ่ายเงินจริงแล้วแต่บันทึกไม่ลง
            // log ข้อมูลให้ครบพอที่จะตามเก็บด้วยมือได้ เพราะสลิปใบนี้ใช้ซ้ำไม่ได้แล้ว
            this.logger.error(
                `PAYMENT VERIFIED BUT NOT RECORDED — donationId=${donation.id} ` +
                `amount=${donation.amount} transRef=${transRef ?? "unknown"} ` +
                `name="${donation.name}" — requires manual reconciliation`,
                err as Error,
            );

            throw err;
        }

        // ---------- 3) เก็บรูปสลิป (best-effort) ----------
        // ถึงตรงนี้โดเนทถูกบันทึกว่าจ่ายแล้วเรียบร้อย รูปเป็นแค่หลักฐานประกอบ
        // ถ้าเขียนไฟล์หรือแนบไม่สำเร็จ ห้าม throw ออกไป เพราะจะทำให้ผู้บริจาค
        // เห็น error ทั้งที่จ่ายเงินสำเร็จแล้ว และอาจไปกดจ่ายซ้ำ
        const filename = safeUploadFilename(file.originalname);
        const dest = path.join(UPLOADS_DIR, filename);
        let storedPath: string | null = null;

        try {
            if (!dest.startsWith(UPLOADS_DIR + path.sep)) {
                throw new Error(`resolved path escaped uploads dir: ${dest}`);
            }

            await fs.promises.writeFile(dest, file.buffer);
            await this.donationsService.attachSlipImage(donation.id, `/uploads/${filename}`);

            storedPath = `/uploads/${filename}`;
        } catch (err) {
            this.logger.error(
                `Donation ${donation.id} is paid but its slip image could not be stored`,
                err as Error,
            );

            // เก็บกวาดไฟล์ที่อาจเขียนไปแล้วบางส่วน
            fs.promises.unlink(dest).catch(() => { });
        }

        return {
            success: true,
            path: storedPath,
            donation: {
                id: updated.id,
                status: updated.status,
                paidAt: updated.paidAt,
            },
        };
    }
}
