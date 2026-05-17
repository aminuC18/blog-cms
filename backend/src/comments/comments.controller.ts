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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('blogs/:id/comments')
  listForBlog(@Param('id') blogId: string) {
    return this.commentsService.listApprovedForBlog(blogId);
  }

  @Post('blogs/:id/comments')
  create(
    @Param('id') blogId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { _id: string },
  ) {
    return this.commentsService.create(blogId, user._id.toString(), dto);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { _id: string; role: Role }) {
    return this.commentsService.remove(id, user);
  }

  @Get('admin/comments')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminList(@Query('status') status?: 'pending' | 'all') {
    return this.commentsService.adminList(status ?? 'pending');
  }

  @Patch('admin/comments/:id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.commentsService.approve(id);
  }

  @Patch('admin/comments/:id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  reject(@Param('id') id: string) {
    return this.commentsService.reject(id);
  }
}
