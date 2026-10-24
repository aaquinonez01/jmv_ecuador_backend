import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { BlockList, isIPv6 } from 'net';
import type { Request } from 'express';

// Rangos publicados en https://www.cloudflare.com/ips/ (revisar si cambian)
const CLOUDFLARE_RANGES: [string, number, 'ipv4' | 'ipv6'][] = [
  ['173.245.48.0', 20, 'ipv4'],
  ['103.21.244.0', 22, 'ipv4'],
  ['103.22.200.0', 22, 'ipv4'],
  ['103.31.4.0', 22, 'ipv4'],
  ['141.101.64.0', 18, 'ipv4'],
  ['108.162.192.0', 18, 'ipv4'],
  ['190.93.240.0', 20, 'ipv4'],
  ['188.114.96.0', 20, 'ipv4'],
  ['197.234.240.0', 22, 'ipv4'],
  ['198.41.128.0', 17, 'ipv4'],
  ['162.158.0.0', 15, 'ipv4'],
  ['104.16.0.0', 13, 'ipv4'],
  ['104.24.0.0', 14, 'ipv4'],
  ['172.64.0.0', 13, 'ipv4'],
  ['131.0.72.0', 22, 'ipv4'],
  ['2400:cb00::', 32, 'ipv6'],
  ['2606:4700::', 32, 'ipv6'],
  ['2803:f800::', 32, 'ipv6'],
  ['2405:b500::', 32, 'ipv6'],
  ['2405:8100::', 32, 'ipv6'],
  ['2a06:98c0::', 29, 'ipv6'],
  ['2c0f:f248::', 32, 'ipv6'],
];

const cloudflare = new BlockList();
for (const [net, prefix, type] of CLOUDFLARE_RANGES) {
  cloudflare.addSubnet(net, prefix, type);
}

const normalizeIp = (ip: string) => ip.replace(/^::ffff:(?=\d+\.)/, '');

export function isCloudflareIp(ip: string | undefined): boolean {
  if (!ip) return false;
  const clean = normalizeIp(ip);
  try {
    return cloudflare.check(clean, isIPv6(clean) ? 'ipv6' : 'ipv4');
  } catch {
    return false;
  }
}

function sameSecret(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * ThrottlerGuard que limita por la IP real del visitante. Detrás de Cloudflare
 * req.ip es la IP de Cloudflare (compartida por muchos usuarios), así que se usa
 * CF-Connecting-IP, pero solo si la petición llegó de verdad desde Cloudflare:
 * quien entra directo al servidor podría inventarse esa cabecera.
 * El frontend (Next) puede indicar la IP del visitante con X-Client-IP firmado
 * con X-Internal-Key = INTERNAL_PROXY_KEY.
 */
@Injectable()
export class RealIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const header = (name: string) => {
      const value = req.headers[name];
      return typeof value === 'string' ? value.trim() : '';
    };
    const peer = normalizeIp(req.ip ?? '');

    const key = process.env.INTERNAL_PROXY_KEY;
    const clientIp = header('x-client-ip');
    if (key && clientIp && sameSecret(header('x-internal-key'), key)) {
      return Promise.resolve(clientIp);
    }

    const cfIp = header('cf-connecting-ip');
    if (cfIp && isCloudflareIp(peer)) {
      return Promise.resolve(cfIp);
    }

    return Promise.resolve(peer);
  }
}
