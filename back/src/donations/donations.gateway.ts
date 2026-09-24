import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';
import { Donation, Setting } from '@prisma/client';
import { toPublicDonation } from 'src/common/utils/donation.util';
import { toPublicSettings } from 'src/settings/public-settings';

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
    // silent = true → overlay alert ไม่ต้องแสดง (เช่น โดเนทคลิปแบบเล่นคลิปอย่างเดียว)
    // แต่ widget อื่น (goal/top/recent) ยังใช้ event นี้รีเฟรชยอด
    emitDonationPaid(data: Donation, ttsAudioUrl: string | null = null, silent = false) {
        // socket นี้ใครก็ต่อได้ — ส่งเฉพาะข้อมูลสาธารณะ
        this.server.emit('donationPaid', {
            ...toPublicDonation(data),
            ttsAudioUrl,
            silent,
        });
    }

    // แจ้งหน้า Overlay/Widget (OBS browser source) ว่า settings เปลี่ยนแล้ว
    // ส่ง settings object เต็มไปเลยเพื่อเลี่ยงการ re-fetch ฝั่ง client
    emitSettingsUpdated(data: Setting) {
        // ไม่ส่งเลขพร้อมเพย์ออกไปให้ทุกคนที่ต่อ socket
        this.server.emit('settingsUpdated', toPublicSettings(data));
    }
}
