import {
    BadRequestException,
    Body,
    Controller,
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

@Controller("upload")
export class UploadController {
    constructor(
        private readonly slipokService: SlipokService,
        private readonly donationsService: DonationsService,
    ) { }

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

        const donation = await this.donationsService.findByToken(
            Number(donationId),
            token,
        );

        if (!donation) {
            throw new NotFoundException("ไม่พบข้อมูลการบริจาค");
        }

        if (donation.status === "paid") {
            throw new BadRequestException("การบริจาคนี้ชำระเงินแล้ว");
        }

        // เก็บผลลัพธ์จาก SlipOK ไว้ใช้ transRef ต่อ
        let transRef: string | undefined;

        try {
            const result = await this.slipokService.checkSlip({
                fileBuffer: file.buffer,
                fileName: file.originalname,
                amount: donation.amount,
            });

            transRef = result.transRef; // เพิ่ม: เก็บ transRef จาก SlipOK
        } catch (err) {
            if (err instanceof SlipOkVerificationException) {
                throw new BadRequestException({
                    code: err.code,
                    message: err.message,
                });
            }
            throw err;
        }

        const filename = safeUploadFilename(file.originalname);
        const uploadsDir = path.resolve("./uploads");
        const dest = path.join(uploadsDir, filename);

        if (!dest.startsWith(uploadsDir + path.sep)) {
            throw new BadRequestException("ชื่อไฟล์ไม่ถูกต้อง");
        }

        fs.writeFileSync(dest, file.buffer);

        const slipImage = `/uploads/${filename}`;

        try {
            const updated = await this.donationsService.confirmPaymentFromSlip(
                donation.id,
                slipImage,
                transRef, // เพิ่ม: ส่ง transRef เข้า service
            );

            return {
                success: true,
                path: slipImage,
                donation: {
                    id: updated.id,
                    status: updated.status,
                    paidAt: updated.paidAt,
                },
            };
        } catch (err) {
            // ถ้า confirm ไม่สำเร็จ (เช่น race condition / มีคน confirm ไปก่อนแล้ว)
            // ลบไฟล์ที่เขียนไปแล้วทิ้งอัตโนมัติ ไม่ให้เป็นไฟล์ขยะค้างใน /uploads/
            fs.unlink(dest, () => { });
            throw err;
        }
    }
}