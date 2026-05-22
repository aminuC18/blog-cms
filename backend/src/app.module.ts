import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiKeyModule } from './api-key/api-key.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { ApiSettingsModule } from './api-settings/api-settings.module';
import { ExternalModule } from './external/external.module';
import { BlogsModule } from './blogs/blogs.module';
import { CommentsModule } from './comments/comments.module';
import { DatabaseModule } from './database/database.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicModule } from './public/public.module';
import { TagsModule } from './tags/tags.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule,
    ApiKeyModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: Number(configService.get('THROTTLE_TTL', 60)) * 1000,
          limit: Number(configService.get('THROTTLE_LIMIT', 100)),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BlogsModule,
    TagsModule,
    CommentsModule,
    NotificationsModule,
    UploadsModule,
    PublicModule,
    ApiSettingsModule,
    ExternalModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
