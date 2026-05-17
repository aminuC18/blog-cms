import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Blog', required: true })
  blog!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ required: true, maxlength: 2000 })
  content!: string;

  @Prop({ type: Types.ObjectId, ref: 'Comment' })
  parentComment?: Types.ObjectId;

  @Prop({ default: false })
  isApproved!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ blog: 1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ isApproved: 1 });
CommentSchema.index({ isDeleted: 1 });
