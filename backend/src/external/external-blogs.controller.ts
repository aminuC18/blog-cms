import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { ListExternalBlogsQueryDto } from './dto/list-external-blogs.dto';
import { PublicService } from '../public/public.service';

/**
 * Partner / headless API for published blogs.
 * Requires `x-api-key` header (see PUBLIC_API_KEY in server env).
 * Optional IP whitelist: PUBLIC_API_IP_WHITELIST (comma-separated IPs/CIDRs).
 */
@ApiTags('External API (v1)')
@ApiSecurity('api-key')
@ApiHeader({
  name: 'x-api-key',
  required: true,
  description: 'Partner API key from Dashboard → API settings',
})
@UseGuards(ApiKeyGuard)
@Controller('v1/blogs')
export class ExternalBlogsController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  @ApiOperation({ summary: 'List published blogs (paginated)' })
  list(@Query() query: ListExternalBlogsQueryDto) {
    return this.publicService.listBlogs({
      page: query.page,
      limit: query.limit,
      tag: query.tag,
      author: query.author,
      q: query.q,
      sort: query.sort,
    });
  }

  @Get('tags')
  @ApiOperation({ summary: 'List all tags' })
  listTags() {
    return this.publicService.listTags();
  }

  @Get('tags/:slug')
  @ApiOperation({ summary: 'List published blogs for a tag slug' })
  blogsByTag(
    @Param('slug') slug: string,
    @Query() query: ListExternalBlogsQueryDto,
  ) {
    return this.publicService.blogsByTag(slug, query.page ?? 1, query.limit ?? 10);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published blog by slug (includes full content)' })
  getBySlug(@Param('slug') slug: string) {
    return this.publicService.getBlogBySlug(slug);
  }
}
