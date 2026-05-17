import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiSettingsService } from './api-settings.service';
import { CreateApiIpRuleDto, CreateApiKeyDto } from './dto/api-settings.dto';

@ApiTags('API settings')
@Controller('api-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class ApiSettingsController {
  constructor(private readonly apiSettingsService: ApiSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'External API keys and IP whitelist (admin)' })
  getOverview() {
    return this.apiSettingsService.getSettingsOverview();
  }

  @Post('keys')
  @ApiOperation({ summary: 'Generate a new API key (shown once)' })
  createKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: { _id: { toString(): string } },
  ) {
    return this.apiSettingsService.createApiKey(dto, user._id.toString());
  }

  @Delete('keys/:id')
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeKey(@Param('id') id: string) {
    return this.apiSettingsService.revokeApiKey(id);
  }

  @Post('ip-rules')
  @ApiOperation({ summary: 'Add optional IP/CIDR whitelist rule' })
  addIpRule(
    @Body() dto: CreateApiIpRuleDto,
    @CurrentUser() user: { _id: { toString(): string } },
  ) {
    return this.apiSettingsService.addIpRule(dto, user._id.toString());
  }

  @Delete('ip-rules/:id')
  @ApiOperation({ summary: 'Remove IP whitelist rule' })
  removeIpRule(@Param('id') id: string) {
    return this.apiSettingsService.removeIpRule(id);
  }
}
