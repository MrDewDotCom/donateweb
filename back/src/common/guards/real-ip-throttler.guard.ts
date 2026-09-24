import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// เมื่อเปิดผ่าน Cloudflare Tunnel ทุก request จะมาจาก cloudflared บนเครื่องนี้ (127.0.0.1)
// ถ้าใช้ IP นั้นตรง ๆ ผู้ใช้ทุกคนจะแชร์ rate limit เดียวกัน
// จึงใช้ header CF-Connecting-IP (IP จริงของผู้ใช้) แต่เชื่อเฉพาะตอนที่ connection มาจาก localhost เท่านั้น
// เพื่อไม่ให้คนภายนอกปลอม header นี้เพื่อหลบ rate limit ได้
@Injectable()
export class RealIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const remote: string | undefined = req.socket?.remoteAddress ?? req.ip;
    const cfIp = req.headers?.['cf-connecting-ip'];

    if (remote && LOOPBACK.has(remote) && typeof cfIp === 'string' && cfIp) {
      return cfIp;
    }

    return remote ?? req.ip;
  }
}
