import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';
import { Donation, Setting } from '@prisma/client';
import { sanitizeDonation } from 'src/common/utils/donation.util';

function parseCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;

    if (!raw) {
        return ['http://localhost:5173'];
    }

    return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

@WebSocketGateway({
    cors: {
        origin: parseCorsOrigins(),
    },
})
export class DonationsGateway {
    @WebSocketServer()
    server: Server;

    // ttsAudioUrl เป็น optional เพราะ TTS อาจปิดอยู่ (settings.ttsEnabled === false)
    // หรือ generate ไม่สำเร็จ — กรณีนั้น overlay จะข้ามการเล่นเสียง TTS ไปเอง
    emitDonationPaid(data: Donation, ttsAudioUrl: string | null = null) {
        this.server.emit('donationPaid', {
            ...sanitizeDonation(data),
            ttsAudioUrl,
        });
    }

    // แจ้งหน้า Overlay/Widget (OBS browser source) ว่า settings เปลี่ยนแล้ว
    // ส่ง settings object เต็มไปเลยเพื่อเลี่ยงการ re-fetch ฝั่ง client
    emitSettingsUpdated(data: Setting) {
        this.server.emit('settingsUpdated', data);
    }
}
