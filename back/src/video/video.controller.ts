import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    // public — overlay /video ใช้ดึงสถานะตอนเปิด/ต่อใหม่
    @Get()
    getState() {
        return this.videoService.getSnapshot();
    }

    @UseGuards(JwtAuthGuard)
    @Post('skip')
    skip() {
        return this.videoService.skipCurrent();
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/remove')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.videoService.removeQueued(id);
    }
}
