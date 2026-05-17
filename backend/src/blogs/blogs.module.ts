import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { Tag, TagSchema } from '../tags/schemas/tag.schema';
import { BlogsController } from './blogs.controller';
import { BlogsSchedulerService } from './blogs.scheduler';
import { BlogsService } from './blogs.service';
import { BlogRevision, BlogRevisionSchema } from './schemas/blog-revision.schema';
import { Blog, BlogSchema } from './schemas/blog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: BlogRevision.name, schema: BlogRevisionSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BlogsController],
  providers: [BlogsService, BlogsSchedulerService],
  exports: [BlogsService],
})
export class BlogsModule {}
