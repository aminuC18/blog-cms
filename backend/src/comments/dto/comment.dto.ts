import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsMongoId()
  parentComment?: string;
}
