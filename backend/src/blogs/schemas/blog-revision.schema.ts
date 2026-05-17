import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlogRevisionDocument = HydratedDocument<BlogRevision>;

@Schema({ timestamps: { createdAt: 'editedAt', updatedAt: false } })
export class BlogRevision {
  @Prop({ type: Types.ObjectId, ref: 'Blog', required: true })
  blog!: Types.ObjectId;

  @Prop({ required: true })
  version!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  editedBy!: Types.ObjectId;

  editedAt!: Date;
}

export const BlogRevisionSchema = SchemaFactory.createForClass(BlogRevision);
