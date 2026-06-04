import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class DonationsGateway {
    @WebSocketServer()
    server: Server;

    emitDonationPaid(data: any) {
        this.server.emit('donationPaid', data);
    }
}