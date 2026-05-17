import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiIpRuleDocument = HydratedDocument<ApiIpRule>;

@Schema({ timestamps: true })
export class ApiIpRule {
  @Prop({ trim: true, maxlength: 80, default: '' })
  label!: string;

  /** IPv4, IPv6, or CIDR (e.g. 203.0.113.0/24). */
  @Prop({ required: true, trim: true })
  value!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const ApiIpRuleSchema = SchemaFactory.createForClass(ApiIpRule);
ApiIpRuleSchema.index({ value: 1 }, { unique: true });
