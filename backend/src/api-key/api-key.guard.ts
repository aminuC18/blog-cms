import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { getClientIp } from './client-ip.util';
import { extractApiKey } from './extract-api-key.util';

/** Requires a valid API key in the `x-api-key` request header. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKeyService.isConfigured()) {
      throw new UnauthorizedException(
        'Public API access is not configured. Generate an API key under Dashboard → API settings.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (this.apiKeyService.isIpWhitelistEnabled()) {
      const clientIp = getClientIp(request);
      if (!this.apiKeyService.isIpAllowed(clientIp)) {
        throw new ForbiddenException('Request IP is not allowed for this API');
      }
    }

    const provided = extractApiKey(request);

    if (!provided) {
      throw new UnauthorizedException(
        'Missing x-api-key header. Send your API key as header: x-api-key: <your-key>',
      );
    }

    if (!this.apiKeyService.validate(provided)) {
      throw new UnauthorizedException('Invalid x-api-key header');
    }

    return true;
  }
}
