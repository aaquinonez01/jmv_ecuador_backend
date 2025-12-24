import { IsArray, IsOptional, IsString } from 'class-validator';

export class ReorderSiteImagesDto {
  @IsString()
  section: string;

  @IsString()
  @IsOptional()
  subsection?: string;

  @IsArray()
  ids: string[];
}

