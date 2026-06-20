import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // จำกัด login: 5 ครั้ง / นาที ต่อ IP — ป้องกัน brute-force password
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @HttpCode(200)
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.username, dto.password);
    }
}