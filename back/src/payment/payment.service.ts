import { Injectable } from "@nestjs/common";
import QRCode from "qrcode";

const generatePayload =
    require("promptpay-qr");

@Injectable()
export class PaymentService {

    async generateQr(
        phone: string,
        amount: number,
    ) {

        const payload =
            generatePayload(
                phone,
                {
                    amount,
                },
            );

        const qrCode =
            await QRCode.toDataURL(
                payload,
            );

        return qrCode;
    }
}