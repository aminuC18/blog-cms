import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BlogStatus } from '../../common/enums/blog-status.enum';

export type BlogDocument = HydratedDocument<Blog>;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, maxlength: 300 })
  summary!: string;

  @Prop({ default: '' })
  content!: string;

  @Prop({ default: '' })
  coverImage!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tags!: Types.ObjectId[];

  @Prop({ type: String, enum: BlogStatus, default: BlogStatus.DRAFT })
  status!: BlogStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ default: '' })
  reviewNotes!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop({ default: '' })
  rejectionReason!: string;

  @Prop()
  publishedAt?: Date;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  unpublishedAt?: Date;

  @Prop({ default: 1 })
  version!: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'BlogRevision' }], default: [] })
  revisions!: Types.ObjectId[];

  @Prop({ default: '' })
  metaTitle!: string;

  @Prop({ default: '' })
  metaDescription!: string;

  @Prop({ default: '' })
  ogImage!: string;

  @Prop({ default: 1 })
  readingTime!: number;

  @Prop({ default: 0 })
  viewCount!: number;

  @Prop({ default: 0 })
  commentCount!: number;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
BlogSchema.index({ status: 1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ publishedAt: -1 });
BlogSchema.index({ isDeleted: 1 });
BlogSchema.index(
  { title: 'text', summary: 'text', content: 'text' },
  { weights: { title: 10, summary: 5, content: 1 } },
);

BlogSchema.pre('save', function handleBlogSave() {
  if (this.isModified('content')) {
    const text = this.content.replace(/<[^>]+>/g, '');
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
});
