import type { Request } from 'express';

/** Client IP for rate limits / API whitelist (respects reverse proxies when trust proxy is enabled). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]?.trim()) {
    return forwarded[0].trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const fromExpress = request.ip?.trim();
  if (fromExpress) {
    return normalizeIp(fromExpress);
  }

  const remote = request.socket.remoteAddress?.trim();
  return remote ? normalizeIp(remote) : '';
}

/** Strip IPv4-mapped IPv6 prefix (::ffff:192.168.0.1 → 192.168.0.1). */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
