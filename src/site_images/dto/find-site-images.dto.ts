import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsSection, optionalText, trimText } from './site-image.validators';

export class FindSiteImagesDto {
  @Transform(trimText)
  @IsString({ message: 'Indica el espacio (section)' })
  @IsNotEmpty({ message: 'Indica el espacio (section)' })
  @IsSection()
  section: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @IsSection('La subsección')
  subsection?: string;
}
