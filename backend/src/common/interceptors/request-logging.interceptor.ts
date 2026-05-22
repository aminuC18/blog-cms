import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'x-api-key',
  'secret',
]);

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startedAt = Date.now();
    const requestId = this.getRequestId(request);
    const endpoint = this.endpointFor(context, request);
    const clientIp = request.ip || request.socket.remoteAddress || 'unknown';

    this.logger.log(
      JSON.stringify({
        event: 'api.request',
        requestId,
        endpoint,
        method: request.method,
        path: request.originalUrl ?? request.url,
        ip: clientIp,
        userAgent: request.get('user-agent'),
        headers: sanitize(request.headers),
        params: sanitize(request.params),
        query: sanitize(request.query),
        body: summarizeBody(request.body),
      }),
    );

    return next.handle().pipe(
      tap((body) => {
        this.logger.log(
          JSON.stringify({
            event: 'api.response',
            requestId,
            endpoint,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            body: summarizeBody(body),
          }),
        );
      }),
      catchError((error: unknown) => {
        const statusCode = statusCodeFrom(error);
        const log =
          statusCode >= 500
            ? this.logger.error.bind(this.logger)
            : this.logger.warn.bind(this.logger);
        log(
          JSON.stringify({
            event: 'api.response',
            requestId,
            endpoint,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode,
            durationMs: Date.now() - startedAt,
            error: messageFrom(error),
          }),
          stackFrom(error),
        );

        return throwError(() => error);
      }),
    );
  }

  private endpointFor(context: ExecutionContext, request: Request): string {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const routePath = request.route?.path;
    const route =
      typeof routePath === 'string'
        ? routePath
        : (request.originalUrl ?? request.url);
    return `${controller}.${handler} ${request.method} ${route}`;
  }

  private getRequestId(request: Request): string | undefined {
    const requestId =
      request.get('x-request-id') ?? request.get('x-correlation-id');
    return requestId || undefined;
  }
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (depth > 4) {
    return '[MAX_DEPTH]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED
        : sanitize(item, depth + 1),
    ]),
  );
}

function summarizeBody(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { type: 'Buffer', bytes: value.length };
  }

  const sanitized = sanitize(value);
  const json = safeStringify(sanitized);
  if (json.length <= 4000) {
    return sanitized;
  }

  return {
    truncated: true,
    bytes: Buffer.byteLength(json),
    preview: `${json.slice(0, 4000)}...`,
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[UNSERIALIZABLE]';
  }
}

function statusCodeFrom(error: unknown): number {
  if (error && typeof error === 'object' && 'getStatus' in error) {
    const candidate = error as { getStatus?: () => number };
    return candidate.getStatus?.() ?? 500;
  }

  return 500;
}

function messageFrom(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function stackFrom(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
