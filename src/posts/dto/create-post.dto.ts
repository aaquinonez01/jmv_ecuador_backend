import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['moments', 'documents'])
  typePost?: string;

  @IsOptional()
  @IsString()
  subtype?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
