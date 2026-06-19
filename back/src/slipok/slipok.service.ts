
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { SlipOkSuccessResponse, SlipOkErrorResponse, SlipOkData } from './types/slipok.types';
import { SlipOkVerificationException } from './exceptions/slipok.exception';

interface CheckSlipParams {
    qrData?: string;
    fileBuffer?: Buffer;
    fileName?: string;
    amount?: number;
}

@Injectable()
export class SlipokService {
    private readonly logger = new Logger(SlipokService.name);
    private readonly apiKey: string;
    private readonly branchId: string;
    private readonly baseUrl = 'https://api.slipok.com/api/line/apikey';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('SLIPOK_API_KEY');
        this.branchId = this.configService.getOrThrow<string>('SLIPOK_BRANCH_ID');
    }

    async checkSlip(params: CheckSlipParams): Promise<SlipOkData> {
        const { qrData, fileBuffer, fileName, amount } = params;

        if (!qrData && !fileBuffer) {
            throw new SlipOkVerificationException(1000, 'ไม่พบข้อมูลสลิปสำหรับตรวจสอบ');
        }

        const url = `${this.baseUrl}/${this.branchId}`;

        try {
            const response = fileBuffer
                ? await this.sendFile(url, fileBuffer, fileName, amount)
                : await this.sendQrData(url, qrData!, amount);

            const body = response.data as SlipOkSuccessResponse;
            return body.data;
        } catch (err) {
            this.handleError(err);
        }
    }

    private sendFile(url: string, fileBuffer: Buffer, fileName?: string, amount?: number) {
        const form = new FormData();
        form.append('files', fileBuffer, { filename: fileName ?? 'slip.jpg' });
        form.append('log', 'true');
        if (amount) form.append('amount', String(amount));

        return firstValueFrom(
            this.httpService.post(url, form, {
                headers: { ...form.getHeaders(), 'x-authorization': this.apiKey },
                timeout: 10000,
            }),
        );
    }

    private sendQrData(url: string, qrData: string, amount?: number) {
        return firstValueFrom(
            this.httpService.post(
                url,
                { data: qrData, log: true, ...(amount ? { amount } : {}) },
                {
                    headers: { 'x-authorization': this.apiKey },
                    timeout: 10000,
                },
            ),
        );
    }

    private handleError(err: unknown): never {
        if (err instanceof AxiosError && err.response) {
            const data = err.response.data as SlipOkErrorResponse;
            this.logger.warn(`SlipOK verification failed: code=${data.code} message=${data.message}`);
            throw new SlipOkVerificationException(data.code, data.message, data.data);
        }

        this.logger.error('SlipOK request failed', err as Error);
        throw new SlipOkVerificationException(-1, 'ไม่สามารถเชื่อมต่อ SlipOK ได้ในขณะนี้');
    }
}