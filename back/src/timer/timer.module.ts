import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TimerController } from './timer.controller';
import { TimerGateway } from './timer.gateway';
import { TimerService } from './timer.service';

@Module({
    imports: [PrismaModule],
    controllers: [TimerController],
    providers: [TimerService, TimerGateway],
    exports: [TimerService],
})
export class TimerModule { }
