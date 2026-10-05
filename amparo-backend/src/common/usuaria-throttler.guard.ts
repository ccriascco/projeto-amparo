import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UsuariaThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.id) {
      return `usuaria:${req.user.id}`;
    }
    const ip = req.ip;
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : null;
    if (typeof req.path === 'string' && req.path.endsWith('/login') && email) {
      return `ip:${ip}:email:${email}`;
    }
    return `ip:${ip}`;
  }
}
