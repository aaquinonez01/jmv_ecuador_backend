import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  LIBRARY_AXES,
  LIBRARY_KINDS,
  LIBRARY_STAGES,
  LIBRARY_TYPES,
  LIBRARY_VISIBILITIES,
  type LibraryAxis,
  type LibraryKind,
  type LibraryStage,
  type LibraryType,
  type LibraryVisibility,
} from '../entities/library-document.entity';
import {
  maxLength,
  optionalText,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  toBool,
  toInt,
  toTags,
  trimText,
} from './transforms';

const oneOf = (field: string, values: readonly string[]) =>
  IsIn(values, { message: `${field} debe ser uno de: ${values.join(', ')}` });

export class CreateLibraryDocumentDto {
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
  @maxLength('El autor', 200)
  author?: string | null;

  @Transform(trimText)
  @IsString({ message: 'El resumen es obligatorio' })
  @MinLength(10, { message: 'El resumen debe tener al menos 10 caracteres' })
  @maxLength('El resumen', 600)
  summary!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La descripción', 10000)
  description?: string | null;

  // Si no llega y se sube un PDF, se asume "pdf"
  @IsOptional()
  @Transform(trimText)
  @oneOf('El formato', LIBRARY_KINDS)
  kind?: LibraryKind;

  @Transform(trimText)
  @oneOf('El tipo', LIBRARY_TYPES)
  type!: LibraryType;

  @IsOptional()
  @Transform(optionalText)
  @oneOf('El eje', LIBRARY_AXES)
  axis?: LibraryAxis | null;

  @IsOptional()
  @Transform(trimText)
  @oneOf('La etapa', LIBRARY_STAGES)
  stage?: LibraryStage;

  @IsOptional()
  @Transform(toTags)
  @IsArray({ message: 'Las etiquetas deben ser una lista' })
  @ArrayMaxSize(20, { message: 'Puedes poner hasta 20 etiquetas' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  @MaxLength(40, {
    each: true,
    message: 'Cada etiqueta puede tener hasta 40 caracteres',
  })
  tags?: string[];

  @IsOptional()
  @Transform(trimText)
  @oneOf('La visibilidad', LIBRARY_VISIBILITIES)
  visibility?: LibraryVisibility;

  // Ruta local (/images/...) o URL https; si se sube "cover", esta se ignora
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL de la portada', 500)
  @Matches(/^(\/images\/|https:\/\/)\S+$/, {
    message: 'La portada debe ser una ruta /images/... o una URL https',
  })
  coverUrl?: string | null;

  // Obligatoria para enlaces y videos
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El enlace', 1000)
  @Matches(/^https:\/\/\S+$/, {
    message: 'El enlace debe empezar por https://',
  })
  externalUrl?: string | null;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'El número de páginas debe ser un número entero' })
  @Min(1, { message: 'El número de páginas debe estar entre 1 y 10000' })
  @Max(10000, { message: 'El número de páginas debe estar entre 1 y 10000' })
  pageCount?: number | null;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'Los minutos de lectura deben ser un número entero' })
  @Min(1, { message: 'Los minutos de lectura deben estar entre 1 y 6000' })
  @Max(6000, { message: 'Los minutos de lectura deben estar entre 1 y 6000' })
  readingMinutes?: number | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'featured debe ser true o false' })
  featured?: boolean;

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
}
