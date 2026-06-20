import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async login(username: string, password: string) {
        const expectedUsername = this.configService.get<string>('ADMIN_USERNAME');
        const passwordHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');

        if (!expectedUsername || !passwordHash) {
            throw new UnauthorizedException('Admin login is not configured');
        }

        // เทียบ username แบบตรงตัว (มี admin คนเดียว ไม่ต้องไปหาใน DB)
        if (username !== expectedUsername) {
            throw new UnauthorizedException('Username หรือ Password ไม่ถูกต้อง');
        }

        const passwordMatches = await bcrypt.compare(password, passwordHash);

        if (!passwordMatches) {
            throw new UnauthorizedException('Username หรือ Password ไม่ถูกต้อง');
        }

        const payload = { sub: 'admin', role: 'admin' };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
}