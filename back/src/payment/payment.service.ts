import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';

@Injectable()
export class PaymentService {
    async generateQRCode(phone: string, amount: number) {
        const payload = generatePayload(phone, { amount });

        const qrCode = await QRCode.toDataURL(payload);

        return qrCode;
    }
}