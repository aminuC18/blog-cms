import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  /** SHA-256(pepper + plainKey) — never returned to clients. */
  @Prop({ required: true, select: false })
  keyHash!: string;

  /** First segment shown in UI (e.g. bk_a1b2c3d4). */
  @Prop({ required: true })
  keyPrefix!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop()
  lastUsedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
ApiKeySchema.index({ keyPrefix: 1 });
ApiKeySchema.index({ isActive: 1 });
