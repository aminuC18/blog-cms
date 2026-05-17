import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiSettingsController } from './api-settings.controller';
import { ApiSettingsService } from './api-settings.service';
import { ApiIpRule, ApiIpRuleSchema } from './schemas/api-ip-rule.schema';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiKey.name, schema: ApiKeySchema },
      { name: ApiIpRule.name, schema: ApiIpRuleSchema },
    ]),
  ],
  controllers: [ApiSettingsController],
  providers: [ApiSettingsService],
  exports: [ApiSettingsService],
})
export class ApiSettingsModule {}
