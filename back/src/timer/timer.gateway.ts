import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { TimerSnapshot } from './timer.service';

function parseCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;

    if (!raw) {
        return ['http://localhost:5173'];
    }

    return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

// ใช้ socket server ตัวเดียวกับ DonationsGateway (พอร์ตเดียวกัน) แค่แยก event ออกมา
@WebSocketGateway({
    cors: {
        origin: parseCorsOrigins(),
    },
})
export class TimerGateway {
    @WebSocketServer()
    server: Server;

    emitTimerUpdated(snapshot: TimerSnapshot) {
        this.server.emit('timerUpdated', snapshot);
    }
}
