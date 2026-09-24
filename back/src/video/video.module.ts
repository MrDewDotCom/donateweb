import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VideoController } from './video.controller';
import { VideoGateway } from './video.gateway';
import { VideoService } from './video.service';

@Module({
    imports: [PrismaModule],
    controllers: [VideoController],
    providers: [VideoService, VideoGateway],
    exports: [VideoService],
})
export class VideoModule { }
