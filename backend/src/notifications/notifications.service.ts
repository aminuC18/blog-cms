import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Role } from '../common/enums/role.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async notifyUsers(
    recipientIds: string[],
    type: NotificationType,
    message: string,
    relatedBlog?: string,
  ) {
    if (!recipientIds.length) {
      return;
    }

    await this.notificationModel.insertMany(
      recipientIds.map((recipient) => ({
        recipient: new Types.ObjectId(recipient),
        type,
        message,
        relatedBlog: relatedBlog ? new Types.ObjectId(relatedBlog) : undefined,
      })),
    );
  }

  async notifyReviewers(type: NotificationType, message: string, relatedBlog?: string) {
    const reviewers = await this.userModel
      .find({
        role: { $in: [Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN] },
        isActive: true,
      })
      .select('_id')
      .exec();

    await this.notifyUsers(
      reviewers.map((user) => user._id.toString()),
      type,
      message,
      relatedBlog,
    );
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const filter = { recipient: new Types.ObjectId(userId) };

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
    return {
      data: items,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    };
  }

  async markRead(userId: string, notificationId: string) {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true },
      )
      .exec();
  }

  async markAllRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async unreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return { count };
  }
}
