import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';

/**
 * Read-only blog API for the CMS site and public pages. No API key required.
 * Partner / headless access: use GET /api/v1/blogs with `x-api-key`.
 */
@ApiTags('Public reads')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('blogs')
  listBlogs(@Query() query: Record<string, string>) {
    return this.publicService.listBlogs({
      page: Number(query.page),
      limit: Number(query.limit),
      tag: query.tag,
      author: query.author,
      q: query.q,
      sort: query.sort,
    });
  }

  @Get('blogs/:slug')
  getBlog(@Param('slug') slug: string) {
    return this.publicService.getBlogBySlug(slug);
  }

  @Get('tags')
  listTags() {
    return this.publicService.listTags();
  }

  @Get('tags/:slug/blogs')
  blogsByTag(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.publicService.blogsByTag(slug, Number(page) || 1, Number(limit) || 10);
  }

  @Get('authors/:username')
  getAuthor(@Param('username') username: string) {
    return this.publicService.getAuthor(username);
  }

  @Get('authors/:username/blogs')
  authorBlogs(
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.publicService.authorBlogs(username, Number(page) || 1, Number(limit) || 10);
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.publicService.search(q, Number(page) || 1, Number(limit) || 10);
  }

  @Get('sitemap')
  sitemap() {
    return this.publicService.sitemap();
  }
}
