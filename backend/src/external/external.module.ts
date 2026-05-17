import { Module } from '@nestjs/common';
import { PublicModule } from '../public/public.module';
import { ExternalBlogsController } from './external-blogs.controller';

@Module({
  imports: [PublicModule],
  controllers: [ExternalBlogsController],
})
export class ExternalModule {}
