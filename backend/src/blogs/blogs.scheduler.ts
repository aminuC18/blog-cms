import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlogsService } from './blogs.service';

@Injectable()
export class BlogsSchedulerService {
  constructor(private readonly blogsService: BlogsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledBlogs() {
    await this.blogsService.publishDueScheduledBlogs();
  }
}
