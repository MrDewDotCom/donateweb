import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const expected = this.config.get<string>('ADMIN_API_KEY');

        if (!expected) {
            throw new UnauthorizedException('Admin API is not configured');
        }

        const request = context.switchToHttp().getRequest<Request>();
        const provided = request.headers['x-admin-api-key'];

        if (typeof provided !== 'string' || provided !== expected) {
            throw new UnauthorizedException('Invalid admin API key');
        }

        return true;
    }
}
