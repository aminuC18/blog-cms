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
import { generateSlug } from '../common/utils/slug.util';
import { NotificationsService } from '../notifications/notifications.service';
import { Tag, TagDocument } from '../tags/schemas/tag.schema';
import {
  CreateBlogDto,
  PublishBlogDto,
  RejectBlogDto,
  ReviewBlogDto,
  UpdateBlogDto,
} from './dto/blog.dto';
import { BlogRevision, BlogRevisionDocument } from './schemas/blog-revision.schema';
import { Blog, BlogDocument } from './schemas/blog.schema';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(BlogRevision.name)
    private readonly revisionModel: Model<BlogRevisionDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Preview the unique slug that would be used for a new title (optionally excluding a blog being edited). */
  async previewSlug(title: string, excludeBlogId?: string) {
    const trimmed = (title || '').trim().slice(0, 500);
    const slug = await this.createUniqueSlug(trimmed || 'untitled', excludeBlogId);
    return { slug };
  }

  async create(dto: CreateBlogDto, authorId: string) {
    const slug = await this.createUniqueSlug(dto.title);
    const blog = await this.blogModel.create({
      ...dto,
      slug,
      author: new Types.ObjectId(authorId),
      tags: dto.tags?.map((tag) => new Types.ObjectId(tag)) ?? [],
    });
    await this.syncTagCounts(blog.tags);
    return this.populateBlog(blog._id.toString());
  }

  async list(
    query: {
      page?: number;
      limit?: number;
      status?: BlogStatus;
      author?: string;
      tag?: string;
      search?: string;
      includeDeleted?: boolean;
    },
    currentUser: { _id: string; role: Role },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const filter: Record<string, unknown> = {};

    if (!query.includeDeleted || currentUser.role !== Role.SUPER_ADMIN) {
      filter.isDeleted = false;
    } else if (query.includeDeleted) {
      filter.isDeleted = true;
    }

    if (query.status) filter.status = query.status;
    if (query.author) filter.author = new Types.ObjectId(query.author);
    if (query.tag) {
      const tag = await this.tagModel.findOne({ slug: query.tag }).exec();
      if (tag) filter.tags = tag._id;
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { summary: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (currentUser.role === Role.AUTHOR) {
      filter.author = new Types.ObjectId(currentUser._id);
    }

    const [items, total] = await Promise.all([
      this.blogModel
        .find(filter)
        .populate('author', 'name email avatarUrl username')
        .populate('tags', 'name slug color')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.blogModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string, currentUser: { _id: string; role: Role }) {
    const blog = await this.populateBlog(id);
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    this.assertCanView(blog, currentUser);
    return blog;
  }

  async update(
    id: string,
    dto: UpdateBlogDto,
    currentUser: { _id: string; role: Role },
  ) {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog || blog.isDeleted) {
      throw new NotFoundException('Blog not found');
    }
    this.assertCanEdit(blog, currentUser);

    const contentChanged =
      dto.content !== undefined ||
      dto.title !== undefined ||
      dto.summary !== undefined;

    if (contentChanged) {
      await this.revisionModel.create({
        blog: blog._id,
        version: blog.version,
        title: blog.title,
        content: blog.content,
        summary: blog.summary,
        editedBy: new Types.ObjectId(currentUser._id),
      });
      blog.version += 1;
    }

    if (dto.title && blog.status !== BlogStatus.PUBLISHED) {
      blog.title = dto.title;
      if (!dto.slug) {
        blog.slug = await this.createUniqueSlug(dto.title, blog._id.toString());
      }
    }

    if (dto.slug && blog.status !== BlogStatus.PUBLISHED) {
      blog.slug = await this.createUniqueSlug(dto.slug, blog._id.toString());
    }

    if (dto.summary !== undefined) blog.summary = dto.summary;
    if (dto.content !== undefined) blog.content = dto.content;
    if (dto.coverImage !== undefined) blog.coverImage = dto.coverImage;
    if (dto.metaTitle !== undefined) blog.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) blog.metaDescription = dto.metaDescription;
    if (dto.ogImage !== undefined) blog.ogImage = dto.ogImage;

    if (dto.tags) {
      const previousTags = blog.tags.map((tag) => tag.toString());
      blog.tags = dto.tags.map((tag) => new Types.ObjectId(tag));
      await this.syncTagCounts(blog.tags, previousTags);
    }

    await blog.save();
    return this.populateBlog(blog._id.toString());
  }

  async softDelete(id: string, currentUser: { _id: string; role: Role }) {
    if (![Role.ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    const blog = await this.blogModel.findById(id).exec();
    if (!blog || blog.isDeleted) {
      throw new NotFoundException('Blog not found');
    }

    blog.isDeleted = true;
    blog.deletedAt = new Date();
    blog.deletedBy = new Types.ObjectId(currentUser._id);
    if (blog.status === BlogStatus.PUBLISHED) {
      blog.status = BlogStatus.UNPUBLISHED;
      blog.unpublishedAt = new Date();
    }
    await blog.save();
    return blog;
  }

  async restore(id: string) {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog || !blog.isDeleted) {
      throw new NotFoundException('Deleted blog not found');
    }

    blog.isDeleted = false;
    blog.deletedAt = undefined;
    blog.deletedBy = undefined;
    blog.status = BlogStatus.DRAFT;
    await blog.save();
    return blog;
  }

  async submitForReview(id: string, currentUser: { _id: string; role: Role }) {
    const blog = await this.getEditableBlog(id, currentUser);
    this.assertTransition(blog.status, BlogStatus.SUBMITTED_FOR_REVIEW);
    blog.status = BlogStatus.SUBMITTED_FOR_REVIEW;
    await blog.save();
    await this.notificationsService.notifyReviewers(
      NotificationType.BLOG_SUBMITTED_FOR_REVIEW,
      `Blog "${blog.title}" was submitted for review`,
      blog._id.toString(),
    );
    return this.populateBlog(blog._id.toString());
  }

  async review(id: string, dto: ReviewBlogDto, currentUser: { _id: string; role: Role }) {
    const blog = await this.getWorkflowBlog(id, currentUser, [Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN]);
    this.assertTransition(blog.status, BlogStatus.REVIEWED);
    blog.status = BlogStatus.REVIEWED;
    blog.reviewedBy = new Types.ObjectId(currentUser._id);
    blog.reviewNotes = dto.reviewNotes ?? '';
    await blog.save();
    await this.notificationsService.notifyUsers(
      [blog.author.toString()],
      NotificationType.BLOG_REVIEWED,
      `Your blog "${blog.title}" was reviewed`,
      blog._id.toString(),
    );
    return this.populateBlog(blog._id.toString());
  }

  async reject(id: string, dto: RejectBlogDto, currentUser: { _id: string; role: Role }) {
    const blog = await this.getWorkflowBlog(id, currentUser, [Role.REVIEWER, Role.ADMIN, Role.SUPER_ADMIN]);
    this.assertTransition(blog.status, BlogStatus.REJECTED);
    blog.status = BlogStatus.REJECTED;
    blog.rejectedBy = new Types.ObjectId(currentUser._id);
    blog.rejectionReason = dto.reason;
    await blog.save();
    await this.notificationsService.notifyUsers(
      [blog.author.toString()],
      NotificationType.BLOG_REJECTED,
      `Your blog "${blog.title}" was rejected`,
      blog._id.toString(),
    );
    return this.populateBlog(blog._id.toString());
  }

  async approve(id: string, currentUser: { _id: string; role: Role }) {
    const blog = await this.getWorkflowBlog(id, currentUser, [Role.ADMIN, Role.SUPER_ADMIN]);
    this.assertTransition(blog.status, BlogStatus.APPROVED);
    blog.status = BlogStatus.APPROVED;
    blog.approvedBy = new Types.ObjectId(currentUser._id);
    await blog.save();
    await this.notificationsService.notifyUsers(
      [blog.author.toString()],
      NotificationType.BLOG_APPROVED,
      `Your blog "${blog.title}" was approved`,
      blog._id.toString(),
    );
    return this.populateBlog(blog._id.toString());
  }

  async publish(id: string, dto: PublishBlogDto, currentUser: { _id: string; role: Role }) {
    const blog = await this.getWorkflowBlog(id, currentUser, [Role.ADMIN, Role.SUPER_ADMIN]);

    if (blog.status === BlogStatus.REVIEWED) {
      blog.status = BlogStatus.APPROVED;
      blog.approvedBy = new Types.ObjectId(currentUser._id);
      await this.notificationsService.notifyUsers(
        [blog.author.toString()],
        NotificationType.BLOG_APPROVED,
        `Your blog "${blog.title}" was approved`,
        blog._id.toString(),
      );
    }

    if (dto.scheduledAt) {
      if (blog.status !== BlogStatus.APPROVED) {
        throw new UnprocessableEntityException(
          `Scheduled publishing is only available for approved blogs. Current status: ${blog.status}.`,
        );
      }
      blog.scheduledAt = new Date(dto.scheduledAt);
      await blog.save();
      return this.populateBlog(blog._id.toString());
    }

    this.assertTransitionForPublish(blog.status);
    blog.status = BlogStatus.PUBLISHED;
    blog.publishedAt = new Date();
    blog.scheduledAt = undefined;
    blog.unpublishedAt = undefined;
    await blog.save();
    await this.notificationsService.notifyUsers(
      [blog.author.toString()],
      NotificationType.BLOG_PUBLISHED,
      `Your blog "${blog.title}" was published`,
      blog._id.toString(),
    );
    return this.populateBlog(blog._id.toString());
  }

  async unpublish(id: string, currentUser: { _id: string; role: Role }) {
    const blog = await this.getWorkflowBlog(id, currentUser, [Role.ADMIN, Role.SUPER_ADMIN]);
    this.assertTransition(blog.status, BlogStatus.UNPUBLISHED);
    blog.status = BlogStatus.UNPUBLISHED;
    blog.unpublishedAt = new Date();
    await blog.save();
    return this.populateBlog(blog._id.toString());
  }

  async listRevisions(id: string) {
    return this.revisionModel
      .find({ blog: id })
      .populate('editedBy', 'name email')
      .sort({ version: -1 })
      .exec();
  }

  async getRevision(id: string, revisionId: string) {
    const revision = await this.revisionModel.findOne({ _id: revisionId, blog: id }).exec();
    if (!revision) {
      throw new NotFoundException('Revision not found');
    }
    return revision;
  }

  async publishDueScheduledBlogs() {
    const due = await this.blogModel
      .find({
        status: BlogStatus.APPROVED,
        scheduledAt: { $lte: new Date() },
        isDeleted: false,
      })
      .exec();

    for (const blog of due) {
      blog.status = BlogStatus.PUBLISHED;
      blog.publishedAt = new Date();
      blog.scheduledAt = undefined;
      await blog.save();
      await this.notificationsService.notifyUsers(
        [blog.author.toString()],
        NotificationType.BLOG_PUBLISHED,
        `Your blog "${blog.title}" was published`,
        blog._id.toString(),
      );
    }
  }

  private async populateBlog(id: string) {
    return this.blogModel
      .findById(id)
      .populate('author', 'name email avatarUrl username')
      .populate('tags', 'name slug color')
      .exec();
  }

  private async getEditableBlog(id: string, currentUser: { _id: string; role: Role }) {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog || blog.isDeleted) {
      throw new NotFoundException('Blog not found');
    }
    this.assertCanEdit(blog, currentUser);
    return blog;
  }

  private async getWorkflowBlog(
    id: string,
    currentUser: { _id: string; role: Role },
    roles: Role[],
  ) {
    if (!roles.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const blog = await this.blogModel.findById(id).exec();
    if (!blog || blog.isDeleted) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  private assertCanView(
    blog: BlogDocument,
    currentUser: { _id: string; role: Role },
  ) {
    if (
      currentUser.role === Role.AUTHOR &&
      blog.author.toString() !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
  }

  private assertCanEdit(
    blog: BlogDocument,
    currentUser: { _id: string; role: Role },
  ) {
    const isOwner = blog.author.toString() === currentUser._id.toString();
    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN].includes(currentUser.role);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
  }

  private assertTransitionForPublish(current: BlogStatus) {
    const allowed: BlogStatus[] = [BlogStatus.APPROVED, BlogStatus.UNPUBLISHED];
    if (allowed.includes(current)) {
      return;
    }
    throw new UnprocessableEntityException(this.publishBlockedMessage(current));
  }

  private publishBlockedMessage(status: BlogStatus): string {
    switch (status) {
      case BlogStatus.DRAFT:
        return 'This post is still a draft. Submit it for review, then approve it before publishing.';
      case BlogStatus.SUBMITTED_FOR_REVIEW:
        return 'This post is waiting for review. After it is reviewed, approve it, then publish.';
      case BlogStatus.REJECTED:
        return 'This post was rejected. Edit it and resubmit for review before it can be published.';
      case BlogStatus.REVIEWED:
        return 'Approve this post before publishing.';
      case BlogStatus.PUBLISHED:
        return 'This post is already published.';
      default:
        return `This post cannot be published while its status is "${status}".`;
    }
  }

  private assertTransition(current: BlogStatus, next: BlogStatus) {
    const allowed: Record<BlogStatus, BlogStatus[]> = {
      [BlogStatus.DRAFT]: [BlogStatus.SUBMITTED_FOR_REVIEW],
      [BlogStatus.SUBMITTED_FOR_REVIEW]: [BlogStatus.REVIEWED, BlogStatus.REJECTED],
      [BlogStatus.REJECTED]: [BlogStatus.DRAFT],
      [BlogStatus.REVIEWED]: [BlogStatus.APPROVED],
      [BlogStatus.APPROVED]: [BlogStatus.PUBLISHED],
      [BlogStatus.PUBLISHED]: [BlogStatus.UNPUBLISHED],
      [BlogStatus.UNPUBLISHED]: [BlogStatus.PUBLISHED],
    };

    if (!allowed[current]?.includes(next)) {
      throw new UnprocessableEntityException(
        `Cannot transition from ${current} to ${next}`,
      );
    }
  }

  private async createUniqueSlug(title: string, excludeId?: string) {
    const base = generateSlug(title) || `blog-${Date.now()}`;
    let slug = base;
    let counter = 1;
    while (true) {
      const filter: Record<string, unknown> = { slug };
      if (excludeId) {
        filter._id = { $ne: new Types.ObjectId(excludeId) };
      }
      const exists = await this.blogModel.exists(filter);
      if (!exists) {
        return slug;
      }
      slug = `${base}-${counter++}`;
    }
  }

  private async syncTagCounts(
    nextTags: Types.ObjectId[],
    previousTags: string[] = [],
  ) {
    const next = new Set(nextTags.map((tag) => tag.toString()));
    const previous = new Set(previousTags);
    const added = [...next].filter((tag) => !previous.has(tag));
    const removed = [...previous].filter((tag) => !next.has(tag));

    await Promise.all([
      ...added.map((tag) =>
        this.tagModel.updateOne({ _id: tag }, { $inc: { blogCount: 1 } }),
      ),
      ...removed.map((tag) =>
        this.tagModel.updateOne({ _id: tag }, { $inc: { blogCount: -1 } }),
      ),
    ]);
  }
}
