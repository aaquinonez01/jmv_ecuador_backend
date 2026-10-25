import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  maxLength,
  optionalText,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  toBool,
  toIdList,
  toInt,
  trimText,
} from './transforms';

export class CreateLibraryCollectionDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El slug', 140)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string | null;

  @Transform(trimText)
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 200)
  title!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La descripción', 2000)
  description?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL de la portada', 500)
  @Matches(/^(\/images\/|https:\/\/)\S+$/, {
    message: 'La portada debe ser una ruta /images/... o una URL https',
  })
  coverUrl?: string | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'published debe ser true o false' })
  published?: boolean;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe estar entre 0 y 9999' })
  @Max(9999, { message: 'El orden debe estar entre 0 y 9999' })
  displayOrder?: number | null;

  // Documentos de la ruta en el orden en que se leen
  @IsOptional()
  @Transform(toIdList)
  @IsArray({ message: 'documentIds debe ser una lista' })
  @ArrayMaxSize(200, { message: 'Una ruta puede tener hasta 200 lecturas' })
  @IsUUID('all', {
    each: true,
    message: 'Cada documento debe ser un id válido',
  })
  documentIds?: string[];
}
