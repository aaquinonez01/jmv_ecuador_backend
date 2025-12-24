import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO para crear un post cuando se envían imágenes como archivos
 * Las imágenes se reciben por separado mediante @UploadedFiles()
 */
export class CreatePostFormDto {
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
  subtype?: string;
}
