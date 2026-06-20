import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// ใช้แทน AdminApiKeyGuard เดิมทุกที่ — เช็ค "Authorization: Bearer <token>"
// ถ้า token ไม่มี/ผิด/หมดอายุ จะ throw 401 อัตโนมัติโดย passport-jwt
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }