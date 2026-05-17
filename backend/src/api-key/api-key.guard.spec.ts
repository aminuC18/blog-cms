import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyGuard', () => {
  const apiKeyService = {
    isConfigured: jest.fn(),
    isIpWhitelistEnabled: jest.fn(),
    isIpAllowed: jest.fn(),
    validate: jest.fn(),
  } as unknown as jest.Mocked<ApiKeyService>;

  const guard = new ApiKeyGuard(apiKeyService);

  const contextWithHeaders = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers, get: (name: string) => headers[name.toLowerCase()] }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    apiKeyService.isConfigured.mockReturnValue(true);
    apiKeyService.isIpWhitelistEnabled.mockReturnValue(false);
  });

  it('returns 401 when x-api-key header is missing', () => {
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(/Missing x-api-key/i);
  });

  it('returns 401 when x-api-key header is invalid', () => {
    apiKeyService.validate.mockReturnValue(false);
    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'bk_invalid' })),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'bk_invalid' })),
    ).toThrow(/Invalid x-api-key/i);
  });

  it('allows request when x-api-key is valid', () => {
    apiKeyService.validate.mockReturnValue(true);
    expect(guard.canActivate(contextWithHeaders({ 'x-api-key': 'bk_valid' }))).toBe(true);
  });
});
