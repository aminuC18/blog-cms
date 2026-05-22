import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateSlug } from '../../common/utils/slug.util';

export type TagDocument = HydratedDocument<Tag>;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, maxlength: 50, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '#64748b' })
  color!: string;

  @Prop({ default: 0 })
  blogCount!: number;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

TagSchema.pre('validate', function handleTagSlug() {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
});
