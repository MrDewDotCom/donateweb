import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { VideoSnapshot } from './video.service';

function parseCorsOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;
    if (!raw) return ['http://localhost:5173'];
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

@WebSocketGateway({ cors: { origin: parseCorsOrigins() } })
export class VideoGateway {
    @WebSocketServer()
    server: Server;

    // overlay /video + หน้าแอดมิน ฟัง event นี้
    emitVideoUpdated(snapshot: VideoSnapshot) {
        this.server.emit('videoUpdated', snapshot);
    }
}
