import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { fileTypeFromBuffer } from 'file-type';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { RedisCacheService } from '../cache/redis-cache.service';

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
  width?: number;
  height?: number;
};

type CloudinaryListResult = {
  resources: CloudinaryResource[];
  next_cursor?: string;
};

export type UploadListResult = {
  items: {
    publicId: string;
    url: string;
    format: string;
    resourceType: string;
    bytes: number;
    createdAt: string;
    width?: number;
    height?: number;
  }[];
  nextCursor: string | null;
};

export type UploadListCacheStatus = 'HIT' | 'MISS';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  private getFolder(): string {
    return this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER', 'blog/uploads');
  }

  private getListCacheTtlSeconds(): number {
    return Number(this.configService.get('UPLOADS_CACHE_TTL_SECONDS', 300));
  }

  private listCacheKey(folder: string, limit: number, cursor?: string): string {
    const folderKey = createHash('sha256').update(folder).digest('hex').slice(0, 16);
    const cursorKey = cursor?.trim() || '_';
    return `uploads:list:${folderKey}:${limit}:${cursorKey}`;
  }

  private listCachePattern(folder: string): string {
    const folderKey = createHash('sha256').update(folder).digest('hex').slice(0, 16);
    return `uploads:list:${folderKey}:*`;
  }

  private async invalidateListCache(folder: string): Promise<void> {
    await this.cache.deleteByPattern(this.listCachePattern(folder));
  }

  async listByFolder(
    cursor?: string,
    limit = 24,
  ): Promise<{ data: UploadListResult; cache: UploadListCacheStatus; cacheLayer?: string }> {
    const folder = this.getFolder();
    const maxResults = Math.min(100, Math.max(1, Math.floor(limit)));
    const cacheKey = this.listCacheKey(folder, maxResults, cursor);

    const { value: cached, layer } = await this.cache.getJson<UploadListResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Upload list cache HIT (${layer}) key=${cacheKey}`);
      return { data: cached, cache: 'HIT', cacheLayer: layer };
    }

    try {
      const result = await new Promise<CloudinaryListResult>((resolve, reject) => {
        cloudinary.api.resources(
          {
            type: 'upload',
            prefix: folder,
            max_results: maxResults,
            ...(cursor ? { next_cursor: cursor } : {}),
          },
          (error, res) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(res as CloudinaryListResult);
          },
        );
      });

      const payload: UploadListResult = {
        items: (result.resources ?? []).map((r) => ({
          publicId: r.public_id,
          url: r.secure_url,
          format: r.format,
          resourceType: r.resource_type,
          bytes: r.bytes,
          createdAt: r.created_at,
          width: r.width,
          height: r.height,
        })),
        nextCursor: result.next_cursor ?? null,
      };

      const ttl = this.getListCacheTtlSeconds();
      await this.cache.setJson(cacheKey, payload, ttl);
      this.logger.debug(`Upload list cache MISS — stored (${ttl}s) key=${cacheKey}`);
      return { data: payload, cache: 'MISS' };
    } catch {
      throw new InternalServerErrorException(
        'Could not load files from Cloudinary. Check API credentials and folder settings.',
      );
    }
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const detected = await fileTypeFromBuffer(file.buffer);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const mime = detected?.mime ?? file.mimetype;
    if (!allowed.has(mime)) {
      throw new BadRequestException('Unsupported image type');
    }

    return this.streamUpload(file.buffer, 'image', mime);
  }

  async uploadFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const sample = file.buffer.subarray(0, Math.min(file.buffer.length, 4100));
    const detected = await fileTypeFromBuffer(sample);
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    const mime = detected?.mime ?? file.mimetype;
    if (!allowed.has(mime)) {
      throw new BadRequestException(
        'Unsupported file type. Use JPG, PNG, WebP, or PDF.',
      );
    }

    const resourceType = mime.startsWith('image/') ? 'image' : 'raw';
    return this.streamUpload(file.buffer, resourceType, mime);
  }

  private async streamUpload(
    buffer: Buffer,
    resourceType: 'image' | 'raw',
    _mime: string,
  ) {
    const folder = this.getFolder();

    try {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
        width?: number;
        height?: number;
        bytes?: number;
        format?: string;
        resource_type?: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: resourceType },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(error ?? new Error('Upload failed'));
              return;
            }
            resolve(uploadResult as never);
          },
        );
        Readable.from(buffer).pipe(stream);
      });

      const uploaded = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
        resourceType: result.resource_type ?? resourceType,
      };

      await this.invalidateListCache(folder);
      return uploaded;
    } catch {
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
