import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsSection, optionalText, trimText } from './site-image.validators';

export class ReorderSiteImagesDto {
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @IsSection()
  section: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @IsSection('La subsección')
  subsection?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids: string[];
}
