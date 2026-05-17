import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AdminSeedService } from './admin.seed';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(AdminSeedService);
  await seedService.seedAdmin();
  await app.close();
}

void runSeed();
