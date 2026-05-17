import { Global, Module } from '@nestjs/common';
import { ApiSettingsModule } from '../api-settings/api-settings.module';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';

@Global()
@Module({
  imports: [ApiSettingsModule],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
