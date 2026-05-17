import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type CacheLayer = 'redis' | 'memory' | 'miss';

type MemoryEntry = {
  payload: string;
  expiresAt: number;
};

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.logger.log(
        'REDIS_URL not set — using in-process memory cache for upload listings',
      );
      return;
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });

    void this.client.connect().then(() => {
      this.logger.log('Redis connected — upload listings cached in Redis + memory');
    }).catch((err: Error) => {
      this.logger.warn(
        `Redis connect failed (${err.message}) — falling back to in-process memory cache`,
      );
      this.client?.disconnect();
      this.client = null;
    });
  }

  onModuleDestroy() {
    void this.client?.quit();
    this.client = null;
    this.memory.clear();
  }

  isRedisReady(): boolean {
    return this.client?.status === 'ready';
  }

  private pruneMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) {
        this.memory.delete(key);
      }
    }
  }

  private getFromMemory<T>(key: string): T | null {
    this.pruneMemory();
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.payload) as T;
    } catch {
      this.memory.delete(key);
      return null;
    }
  }

  private setMemory(key: string, value: unknown, ttlSeconds: number) {
    const ttl = Math.max(1, ttlSeconds);
    this.memory.set(key, {
      payload: JSON.stringify(value),
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  private deleteMemoryByPattern(pattern: string) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key);
      }
    }
  }

  async getJson<T>(key: string): Promise<{ value: T | null; layer: CacheLayer }> {
    if (this.isRedisReady() && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          const value = JSON.parse(raw) as T;
          return { value, layer: 'redis' };
        }
      } catch (err) {
        this.logger.warn(`Redis GET failed for ${key}: ${(err as Error).message}`);
      }
    }

    const fromMemory = this.getFromMemory<T>(key);
    if (fromMemory) {
      return { value: fromMemory, layer: 'memory' };
    }

    return { value: null, layer: 'miss' };
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.setMemory(key, value, ttlSeconds);

    if (!this.isRedisReady() || !this.client) return;

    try {
      const payload = JSON.stringify(value);
      await this.client.setex(key, Math.max(1, ttlSeconds), payload);
    } catch (err) {
      this.logger.warn(`Redis SET failed for ${key}: ${(err as Error).message}`);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    this.deleteMemoryByPattern(pattern);

    if (!this.isRedisReady() || !this.client) return;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Redis SCAN/DEL failed for ${pattern}: ${(err as Error).message}`);
    }
  }
}
