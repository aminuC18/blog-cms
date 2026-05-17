import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { _id: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.listForUser(
      user._id.toString(),
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { _id: string }) {
    return this.notificationsService.markAllRead(user._id.toString());
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { _id: string }) {
    return this.notificationsService.unreadCount(user._id.toString());
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { _id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(user._id.toString(), id);
  }
}
