import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { TimerService } from './timer.service';

class AdjustTimerDto {
    // วินาทีที่จะเพิ่ม (ติดลบ = ลด) สูงสุด ±24 ชม. ต่อครั้ง
    @IsInt()
    @Min(-86400)
    @Max(86400)
    seconds!: number;
}

@Controller('timer')
export class TimerController {
    constructor(private readonly timerService: TimerService) { }

    // public — หน้า overlay /timer ใน OBS ใช้ดึงสถานะเริ่มต้น
    @Get()
    getTimer() {
        return this.timerService.getSnapshot();
    }

    @UseGuards(JwtAuthGuard)
    @Post('pause')
    pause() {
        return this.timerService.pause();
    }

    @UseGuards(JwtAuthGuard)
    @Post('resume')
    resume() {
        return this.timerService.resume();
    }

    @UseGuards(JwtAuthGuard)
    @Post('reset')
    reset() {
        return this.timerService.reset();
    }

    // ปรับเวลาเอง (admin) — ไม่เริ่มเดินให้อัตโนมัติ ถ้าหยุดอยู่ก็หยุดต่อ
    @UseGuards(JwtAuthGuard)
    @Post('adjust')
    adjust(@Body() body: AdjustTimerDto) {
        return this.timerService.addTime(body.seconds, false);
    }
}
