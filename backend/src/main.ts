import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  humanizeFieldName,
  humanizeValidationMessage,
} from './common/utils/user-error.util';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const trustProxy = configService.get<string>('TRUST_PROXY', 'false');
  if (trustProxy === 'true' || trustProxy === '1') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3002',
  );
  const extraOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = [
    ...new Set([frontendUrl, ...extraOrigins].filter(Boolean)),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'X-API-KEY',
      'X-Api-Key',
    ],
    exposedHeaders: ['X-Cache'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Please fix the highlighted fields and try again.',
          errors: errors.flatMap((error) => flattenValidationErrors(error)),
        }),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Blog CMS API')
    .setDescription('Bespoke blog platform API')
    .setVersion('2.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Public partner API key (PUBLIC_API_KEY)',
      },
      'api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      // Ensure Try it out sends the api-key scheme (not only bearer).
      authAction: {
        'api-key': {
          name: 'api-key',
          schema: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
          value: '',
        },
      },
    },
  });

  const port = Number(configService.get('PORT', 3001));
  await app.listen(port);
  logger.log(`Backend API listening on port ${port}`);
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Critical backend startup failure',
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});

function flattenValidationErrors(
  error: {
    property: string;
    constraints?: Record<string, string>;
    children?: Array<{
      property: string;
      constraints?: Record<string, string>;
      children?: unknown[];
    }>;
  },
  parentPath = '',
): Array<{ field: string; message: string }> {
  const fieldPath = parentPath
    ? `${parentPath}.${error.property}`
    : error.property;
  const current = error.constraints
    ? Object.values(error.constraints).map((message) => ({
        field: fieldPath,
        message: `${humanizeFieldName(fieldPath)}: ${humanizeValidationMessage(message, fieldPath)}`,
      }))
    : [];

  const nested =
    error.children?.flatMap((child) =>
      flattenValidationErrors(child as never, fieldPath),
    ) ?? [];

  return [...current, ...nested];
}
