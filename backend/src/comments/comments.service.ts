import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BlogStatus } from '../common/enums/blog-status.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Role } from '../common/enums/role.enum';
import { Blog, BlogDocument } from '../blogs/schemas/blog.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/comment.dto';
import { Comment, CommentDocument } from './schemas/comment.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listApprovedForBlog(blogId: string) {
    return this.commentModel
      .find({ blog: blogId, isApproved: true, isDeleted: false, parentComment: null })
      .populate('author', 'name avatarUrl username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(blogId: string, authorId: string, dto: CreateCommentDto) {
    const blog = await this.blogModel.findById(blogId).exec();
    if (!blog || blog.isDeleted || blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException('Blog not found');
    }

    if (dto.parentComment) {
      const parent = await this.commentModel.findById(dto.parentComment).exec();
      if (!parent || parent.blog.toString() !== blogId || parent.parentComment) {
        throw new UnprocessableEntityException('Invalid parent comment');
      }
    }

    const comment = await this.commentModel.create({
      blog: new Types.ObjectId(blogId),
      author: new Types.ObjectId(authorId),
      content: dto.content,
      parentComment: dto.parentComment
        ? new Types.ObjectId(dto.parentComment)
        : undefined,
    });

    await this.blogModel.updateOne({ _id: blogId }, { $inc: { commentCount: 1 } });

    if (dto.parentComment) {
      const parent = await this.commentModel.findById(dto.parentComment).exec();
      if (parent) {
        await this.notificationsService.notifyUsers(
          [parent.author.toString()],
          NotificationType.COMMENT_REPLY,
          'Someone replied to your comment',
          blogId,
        );
      }
    } else {
      await this.notificationsService.notifyUsers(
        [blog.author.toString()],
        NotificationType.COMMENT_POSTED,
        `A new comment was posted on "${blog.title}"`,
        blogId,
      );
    }

    return comment.populate('author', 'name avatarUrl username');
  }

  async remove(commentId: string, currentUser: { _id: string; role: Role }) {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    const isOwner = comment.author.toString() === currentUser._id.toString();
    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment.');
    }

    comment.isDeleted = true;
    await comment.save();
    return comment;
  }

  async adminList(status: 'pending' | 'all' = 'pending') {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (status === 'pending') {
      filter.isApproved = false;
    }
    return this.commentModel
      .find(filter)
      .populate('author', 'name email')
      .populate('blog', 'title slug')
      .sort({ createdAt: -1 })
      .exec();
  }

  async approve(commentId: string) {
    const comment = await this.commentModel
      .findByIdAndUpdate(commentId, { isApproved: true }, { new: true })
      .exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async reject(commentId: string) {
    const comment = await this.commentModel
      .findByIdAndUpdate(commentId, { isDeleted: true }, { new: true })
      .exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }
}
