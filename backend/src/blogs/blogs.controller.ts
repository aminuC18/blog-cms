import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BlogsService } from './blogs.service';
import {
  CreateBlogDto,
  PublishBlogDto,
  RejectBlogDto,
  ReviewBlogDto,
  UpdateBlogDto,
} from './dto/blog.dto';

@Controller('blogs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  @Roles(Role.AUTHOR, Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateBlogDto, @CurrentUser() user: { _id: string }) {
    return this.blogsService.create(dto, user._id.toString());
  }

  @Get()
  list(
    @Query() query: Record<string, string>,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.list(
      {
        page: Number(query.page),
        limit: Number(query.limit),
        status: query.status as never,
        author: query.author,
        tag: query.tag,
        search: query.search,
        includeDeleted: query.includeDeleted === 'true',
      },
      user,
    );
  }

  /** Returns `{ slug }` for the URL that would be generated from `title` (collision-safe). Optional `excludeId` when editing an existing draft. */
  @Get('slug-preview')
  previewSlug(
    @Query('title') title?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.blogsService.previewSlug(title ?? '', excludeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { _id: string; role: Role }) {
    return this.blogsService.findById(id, user);
  }

  @Patch(':id')
  @Roles(Role.AUTHOR, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: { _id: string; role: Role }) {
    return this.blogsService.softDelete(id, user);
  }

  @Post(':id/submit-review')
  @Roles(Role.AUTHOR, Role.ADMIN, Role.SUPER_ADMIN)
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.submitForReview(id, user);
  }

  @Post(':id/review')
  @Roles(Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewBlogDto,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.review(id, dto, user);
  }

  @Post(':id/reject')
  @Roles(Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBlogDto,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.reject(id, dto, user);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: { _id: string; role: Role }) {
    return this.blogsService.approve(id, user);
  }

  @Post(':id/publish')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  publish(
    @Param('id') id: string,
    @Body() dto: PublishBlogDto,
    @CurrentUser() user: { _id: string; role: Role },
  ) {
    return this.blogsService.publish(id, dto, user);
  }

  @Post(':id/unpublish')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  unpublish(@Param('id') id: string, @CurrentUser() user: { _id: string; role: Role }) {
    return this.blogsService.unpublish(id, user);
  }

  @Get(':id/revisions')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  revisions(@Param('id') id: string) {
    return this.blogsService.listRevisions(id);
  }

  @Get(':id/revisions/:revisionId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  revision(@Param('id') id: string, @Param('revisionId') revisionId: string) {
    return this.blogsService.getRevision(id, revisionId);
  }

  @Post(':id/restore')
  @Roles(Role.SUPER_ADMIN)
  restore(@Param('id') id: string) {
    return this.blogsService.restore(id);
  }
}
