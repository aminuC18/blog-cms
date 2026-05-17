import type { Request } from 'express';

/**
 * Reads the partner API key from the incoming request.
 * Primary: `x-api-key` header (Swagger, curl, most HTTP clients).
 */
export function extractApiKey(request: Request): string | undefined {
  const fromGet = request.get('x-api-key')?.trim();
  if (fromGet) {
    return fromGet;
  }

  const raw = request.headers['x-api-key'];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  if (Array.isArray(raw) && raw[0]?.trim()) {
    return raw[0].trim();
  }

  return undefined;
}
