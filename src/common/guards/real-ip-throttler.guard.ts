import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * ThrottlerGuard que limita por la IP real del visitante. Detrás de Cloudflare
 * req.ip es la IP de Cloudflare (compartida por muchos usuarios), así que se usa
 * la cabecera CF-Connecting-IP cuando existe.
 */
@Injectable()
export class RealIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const cfIp = req.headers['cf-connecting-ip'];
    return Promise.resolve(
      typeof cfIp === 'string' && cfIp ? cfIp : (req.ip ?? ''),
    );
  }
}
