import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BlogStatus } from '../../common/enums/blog-status.enum';

export class CreateBlogDto {
  @IsString()
  title!: string;

  @IsString()
  @MaxLength(300)
  summary!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

export class RejectBlogDto {
  @IsString()
  reason!: string;
}

export class ReviewBlogDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class PublishBlogDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BlogQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @IsOptional()
  author?: string;

  @IsOptional()
  tag?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  includeDeleted?: string;
}
