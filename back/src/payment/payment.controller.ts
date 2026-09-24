import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { PaymentService } from "./payment.service";

@Controller("payment")
export class PaymentController {

    constructor(private readonly paymentService: PaymentService,) { }

    // เดิมเปิดสาธารณะ (ใครก็สร้าง QR ได้ไม่จำกัด) และหน้าเว็บไม่ได้ใช้ — จำกัดให้แอดมินเท่านั้น
    @UseGuards(JwtAuthGuard)
    @Get("qr")
    async generateQr(
        @Query("amount")
        amount: number,
        @Query("phone")
        phone: string,
    ) {
        return {
            qrCode: await this.paymentService.generateQr(phone, Number(amount,),),
        };
    }
}