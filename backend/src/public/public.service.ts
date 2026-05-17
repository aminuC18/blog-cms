import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogStatus } from '../common/enums/blog-status.enum';
import { Blog, BlogDocument } from '../blogs/schemas/blog.schema';
import { Tag, TagDocument } from '../tags/schemas/tag.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async listBlogs(query: {
    page?: number;
    limit?: number;
    tag?: string;
    author?: string;
    q?: string;
    sort?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const filter: Record<string, unknown> = {
      status: BlogStatus.PUBLISHED,
      isDeleted: false,
    };

    if (query.tag) {
      const tag = await this.tagModel.findOne({ slug: query.tag }).exec();
      if (tag) filter.tags = tag._id;
    }

    if (query.author) {
      const author = await this.userModel.findOne({ username: query.author }).exec();
      if (author) filter.author = author._id;
    }

    let mongoQuery = this.blogModel.find(filter);
    if (query.q) {
      mongoQuery = this.blogModel.find(
        { ...filter, $text: { $search: query.q } },
        { score: { $meta: 'textScore' } },
      );
    }

    const sort = this.parseSort(query.sort, Boolean(query.q));
    const [items, total] = await Promise.all([
      mongoQuery
        .populate('author', 'name username avatarUrl')
        .populate('tags', 'name slug color')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-content')
        .exec(),
      this.blogModel.countDocuments(
        query.q ? { ...filter, $text: { $search: query.q } } : filter,
      ),
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

  async getBlogBySlug(slug: string) {
    const blog = await this.blogModel
      .findOne({ slug, status: BlogStatus.PUBLISHED, isDeleted: false })
      .populate('author', 'name username avatarUrl bio socialLinks')
      .populate('tags', 'name slug color')
      .exec();

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    await this.blogModel.updateOne({ _id: blog._id }, { $inc: { viewCount: 1 } });
    return blog;
  }

  async listTags() {
    return this.tagModel.find().sort({ name: 1 }).exec();
  }

  async blogsByTag(slug: string, page = 1, limit = 10) {
    return this.listBlogs({ tag: slug, page, limit });
  }

  async getAuthor(username: string) {
    const author = await this.userModel
      .findOne({ username: username.toLowerCase(), isActive: true })
      .select('name username bio avatarUrl socialLinks')
      .exec();
    if (!author) {
      throw new NotFoundException('Author not found');
    }
    return author;
  }

  async authorBlogs(username: string, page = 1, limit = 10) {
    return this.listBlogs({ author: username, page, limit });
  }

  async search(q: string, page = 1, limit = 10) {
    return this.listBlogs({ q, page, limit });
  }

  async sitemap() {
    return this.blogModel
      .find({ status: BlogStatus.PUBLISHED, isDeleted: false })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .exec();
  }

  private parseSort(sort?: string, hasTextScore = false) {
    if (hasTextScore) {
      return { score: { $meta: 'textScore' } } as never;
    }
    const [field, direction] = (sort ?? 'publishedAt:desc').split(':');
    return { [field]: direction === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
  }
}
