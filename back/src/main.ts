import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

function parseCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;

    if (!raw) {
        return ['http://localhost:5173'];
    }

    return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Helmet ตั้ง security headers พื้นฐาน (HSTS, X-Content-Type-Options,
    // X-Frame-Options, ฯลฯ) ต้องมาก่อน ValidationPipe/CORS เสมอ
    app.use(
        helmet({
            // ปิด CSP ของ helmet ไว้ก่อน เพราะ frontend อยู่ origin อื่น (Vite dev server)
            // และยังไม่ได้กำหนด policy ที่ละเอียดพอ เปิดทีหลังได้ถ้าต้องการเข้มขึ้น
            contentSecurityPolicy: false,
            // อนุญาตให้ frontend (origin อื่น) โหลดรูปสลิปจาก /uploads/ ได้
            // ถ้าไม่ตั้งตรงนี้ helmet จะ block ด้วย default "same-origin"
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    app.enableCors({
        origin: parseCorsOrigins(),
        credentials: true,
    });

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();