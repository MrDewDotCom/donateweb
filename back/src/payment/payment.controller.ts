import { Controller, Get, Query, } from "@nestjs/common";
import { PaymentService } from "./payment.service";

@Controller("payment")
export class PaymentController {

    constructor(private readonly paymentService: PaymentService,) { }

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