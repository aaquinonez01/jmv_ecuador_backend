import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ALT_MAX,
  IsSection,
  optionalText,
  toBool,
  toObject,
  trimText,
} from './site-image.validators';

export class CreateSiteImageDto {
  @Transform(trimText)
  @IsString()
  @IsNotEmpty({ message: 'Indica el espacio de la foto' })
  @IsSection()
  section: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @IsSection('La subsección')
  subsection?: string;

  @Transform(trimText)
  @IsString()
  @MinLength(3, {
    message: 'El texto alternativo debe tener al menos 3 caracteres',
  })
  @MaxLength(ALT_MAX, {
    message: `El texto alternativo puede tener hasta ${ALT_MAX} caracteres`,
  })
  alt: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(toObject)
  @IsObject()
  eventData?: {
    date?: string;
    location?: string;
    status?: string;
  };

  @IsOptional()
  @Transform(toObject)
  @IsObject()
  personData?: {
    name?: string;
    role?: string;
    zone?: string;
  };

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  groupId?: string;
}
