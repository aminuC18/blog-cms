import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeyModule } from '../api-key/api-key.module';
import { Blog, BlogSchema } from '../blogs/schemas/blog.schema';
import { Tag, TagSchema } from '../tags/schemas/tag.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [
    ApiKeyModule,
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Tag.name, schema: TagSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
