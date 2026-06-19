import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';
import { Donation } from '@prisma/client';
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

    emitDonationPaid(data: Donation) {
        this.server.emit('donationPaid', sanitizeDonation(data));
    }
}
