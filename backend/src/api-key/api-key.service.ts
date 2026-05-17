import { Injectable } from '@nestjs/common';
import { ApiSettingsService } from '../api-settings/api-settings.service';
import { isIpAllowed } from './ip-whitelist.util';

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiSettingsService: ApiSettingsService) {}

  isConfigured(): boolean {
    return this.apiSettingsService.getValidationSnapshot().keyHashes.length > 0;
  }

  isIpWhitelistEnabled(): boolean {
    return this.apiSettingsService.isIpWhitelistEnabled();
  }

  isIpAllowed(clientIp: string): boolean {
    const { ipBlockList } = this.apiSettingsService.getValidationSnapshot();
    return isIpAllowed(ipBlockList, clientIp);
  }

  validate(provided: string | undefined): boolean {
    if (!provided?.trim()) {
      return false;
    }
    const hash = this.apiSettingsService.hashPlainKey(provided.trim());
    const { keyHashes } = this.apiSettingsService.getValidationSnapshot();
    const valid = keyHashes.includes(hash);
    if (valid) {
      void this.apiSettingsService.touchKeyUsage(provided.trim());
    }
    return valid;
  }
}
