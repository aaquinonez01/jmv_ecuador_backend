import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ALT_MAX,
  optionalText,
  toBool,
  toInt,
  toObject,
} from './site-image.validators';

// La foto no cambia de espacio al editarla: para moverla, se elimina y se sube de nuevo.
export class UpdateSiteImageDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MinLength(3, {
    message: 'El texto alternativo debe tener al menos 3 caracteres',
  })
  @MaxLength(ALT_MAX, {
    message: `El texto alternativo puede tener hasta ${ALT_MAX} caracteres`,
  })
  alt?: string;

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
  @Transform(toInt)
  @IsInt()
  @Min(1)
  orden?: number;

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
}
