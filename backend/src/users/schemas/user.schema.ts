import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ type: String, enum: Role, default: Role.AUTHOR })
  role!: Role;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: '' })
  bio!: string;

  @Prop({ default: '' })
  avatarUrl!: string;

  @Prop({ unique: true, sparse: true, trim: true, lowercase: true })
  username?: string;

  @Prop({
    type: {
      twitter: String,
      github: String,
      linkedin: String,
      website: String,
    },
    default: {},
  })
  socialLinks!: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };

  @Prop({ select: false })
  refreshToken?: string;

  @Prop()
  refreshTokenExpiry?: Date;

  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  emailNotificationPreferences!: Map<string, boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1 });
