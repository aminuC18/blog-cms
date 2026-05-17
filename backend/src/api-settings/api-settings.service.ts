import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { BlockList } from 'net';
import { parseIpWhitelist } from '../api-key/ip-whitelist.util';
import { ApiIpRule, ApiIpRuleDocument } from './schemas/api-ip-rule.schema';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { CreateApiIpRuleDto, CreateApiKeyDto } from './dto/api-settings.dto';

export type ApiKeyPublic = {
  _id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export type ApiIpRulePublic = {
  _id: string;
  label: string;
  value: string;
  createdAt: string;
};

type ValidationSnapshot = {
  keyHashes: string[];
  ipBlockList: BlockList | null;
};

@Injectable()
export class ApiSettingsService implements OnModuleInit {
  private snapshot: ValidationSnapshot = { keyHashes: [], ipBlockList: null };

  constructor(
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
    @InjectModel(ApiIpRule.name) private readonly ipRuleModel: Model<ApiIpRuleDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.refreshValidationSnapshot();
    await this.importEnvKeyIfEmpty();
  }

  private getPepper(): string {
    return (
      this.configService.get<string>('API_KEY_PEPPER')?.trim() ||
      this.configService.getOrThrow<string>('JWT_SECRET')
    );
  }

  hashPlainKey(plainKey: string): string {
    return createHash('sha256').update(`${this.getPepper()}${plainKey}`).digest('hex');
  }

  private generatePlainKey(): string {
    const token = randomBytes(24).toString('base64url');
    return `bk_${token}`;
  }

  private async importEnvKeyIfEmpty() {
    const count = await this.apiKeyModel.countDocuments().exec();
    if (count > 0) {
      return;
    }

    const envKey = this.configService.get<string>('PUBLIC_API_KEY')?.trim();
    if (!envKey) {
      return;
    }

    const prefix = envKey.slice(0, 12);
    await this.apiKeyModel.create({
      name: 'Imported from PUBLIC_API_KEY',
      keyHash: this.hashPlainKey(envKey),
      keyPrefix: prefix,
      isActive: true,
    });
    await this.refreshValidationSnapshot();
  }

  async refreshValidationSnapshot(): Promise<void> {
    const keys = await this.apiKeyModel
      .find({ isActive: true })
      .select('keyHash')
      .lean()
      .exec();

    const envHashes: string[] = [];
    const envKey = this.configService.get<string>('PUBLIC_API_KEY')?.trim();
    if (envKey) {
      envHashes.push(this.hashPlainKey(envKey));
    }
    const envKeys =
      this.configService
        .get<string>('PUBLIC_API_KEYS')
        ?.split(',')
        .map((k) => k.trim())
        .filter(Boolean) ?? [];
    for (const k of envKeys) {
      envHashes.push(this.hashPlainKey(k));
    }

    const ipRules = await this.ipRuleModel.find().lean().exec();
    const ipValues = ipRules.map((r) => r.value);

    const envIps =
      this.configService
        .get<string>('PUBLIC_API_IP_WHITELIST')
        ?.split(',')
        .map((e) => e.trim())
        .filter(Boolean) ?? [];

    const allIps = [...ipValues, ...envIps];
    let ipBlockList: BlockList | null = null;
    if (allIps.length > 0) {
      try {
        ipBlockList = parseIpWhitelist(allIps);
      } catch {
        ipBlockList = null;
      }
    }

    this.snapshot = {
      keyHashes: [
        ...new Set([
          ...keys.map((k) => k.keyHash as string),
          ...envHashes,
        ]),
      ],
      ipBlockList,
    };
  }

  getValidationSnapshot(): ValidationSnapshot {
    return this.snapshot;
  }

  isIpWhitelistEnabled(): boolean {
    return this.snapshot.ipBlockList !== null;
  }

  async getSettingsOverview() {
    const [keys, ipRules] = await Promise.all([
      this.apiKeyModel.find().sort({ createdAt: -1 }).exec(),
      this.ipRuleModel.find().sort({ createdAt: -1 }).exec(),
    ]);

    return {
      keys: keys.map((k) => this.toPublicKey(k)),
      ipRules: ipRules.map((r) => this.toPublicIpRule(r)),
      ipWhitelistEnabled: this.isIpWhitelistEnabled(),
      envFallback: {
        hasPublicApiKey: Boolean(this.configService.get<string>('PUBLIC_API_KEY')?.trim()),
        hasIpWhitelistEnv: Boolean(
          this.configService.get<string>('PUBLIC_API_IP_WHITELIST')?.trim(),
        ),
      },
    };
  }

  private defaultKeyName(): string {
    const stamp = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    return `API key · ${stamp}`;
  }

  async createApiKey(dto: CreateApiKeyDto, userId: string) {
    const revokeResult = await this.apiKeyModel
      .updateMany({ isActive: true }, { isActive: false })
      .exec();
    const replacedPrevious = revokeResult.modifiedCount > 0;

    const plainKey = this.generatePlainKey();
    const name = dto.name?.trim() || this.defaultKeyName();
    const doc = await this.apiKeyModel.create({
      name,
      keyHash: this.hashPlainKey(plainKey),
      keyPrefix: plainKey.slice(0, 12),
      isActive: true,
      createdBy: userId,
    });

    await this.refreshValidationSnapshot();

    return {
      plainKey,
      key: this.toPublicKey(doc),
      replacedPrevious,
    };
  }

  async revokeApiKey(id: string) {
    const doc = await this.apiKeyModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!doc) {
      throw new NotFoundException('API key not found');
    }
    await this.refreshValidationSnapshot();
    return this.toPublicKey(doc);
  }

  async addIpRule(dto: CreateApiIpRuleDto, userId: string) {
    const value = dto.value.trim();
    try {
      parseIpWhitelist([value]);
    } catch {
      throw new ConflictException('Invalid IP address or CIDR notation');
    }

    try {
      const doc = await this.ipRuleModel.create({
        label: dto.label?.trim() ?? '',
        value,
        createdBy: userId,
      });
      await this.refreshValidationSnapshot();
      return this.toPublicIpRule(doc);
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('This IP or CIDR is already on the whitelist');
      }
      throw err;
    }
  }

  async removeIpRule(id: string) {
    const doc = await this.ipRuleModel.findByIdAndDelete(id).exec();
    if (!doc) {
      throw new NotFoundException('IP rule not found');
    }
    await this.refreshValidationSnapshot();
    return { deleted: true };
  }

  async touchKeyUsage(plainKey: string) {
    const hash = this.hashPlainKey(plainKey);
    await this.apiKeyModel
      .updateOne({ keyHash: hash, isActive: true }, { lastUsedAt: new Date() })
      .exec();
  }

  private toPublicKey(doc: ApiKeyDocument): ApiKeyPublic {
    const createdAt =
      'createdAt' in doc && doc.createdAt
        ? new Date(doc.createdAt as Date).toISOString()
        : new Date().toISOString();
    return {
      _id: String(doc._id),
      name: doc.name,
      keyPrefix: doc.keyPrefix,
      isActive: doc.isActive,
      createdAt,
      lastUsedAt: doc.lastUsedAt
        ? new Date(doc.lastUsedAt).toISOString()
        : undefined,
    };
  }

  private toPublicIpRule(doc: ApiIpRuleDocument): ApiIpRulePublic {
    const createdAt =
      'createdAt' in doc && doc.createdAt
        ? new Date(doc.createdAt as Date).toISOString()
        : new Date().toISOString();
    return {
      _id: String(doc._id),
      label: doc.label,
      value: doc.value,
      createdAt,
    };
  }
}
