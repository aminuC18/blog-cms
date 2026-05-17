import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class CreateApiIpRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}
