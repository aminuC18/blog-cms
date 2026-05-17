import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  @Roles(Role.AUTHOR, Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const { data, cache, cacheLayer } = await this.uploadsService.listByFolder(
      cursor,
      Number(limit) || 24,
    );

    if (res) {
      res.setHeader('X-Cache', cache);
      if (cacheLayer) {
        res.setHeader('X-Cache-Layer', cacheLayer);
      }
      if (cache === 'HIT') {
        res.setHeader('Cache-Control', 'private, max-age=60');
      }
    }

    return data;
  }

  @Post('image')
  @Roles(Role.AUTHOR, Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadImage(file);
  }

  @Post('file')
  @Roles(Role.AUTHOR, Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadFile(file);
  }
}
