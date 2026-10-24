import { Transform } from 'class-transformer';
import {
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
  CALENDAR_CATEGORIES,
  type CalendarCategory,
} from '../entities/calendar-date.entity';

// Los formularios multipart envían todo como texto: estas funciones convierten
// los valores antes de validar. Un texto vacío en un campo opcional = null.
type Raw = { value: unknown };

const trimText = ({ value }: Raw) =>
  typeof value === 'string' ? value.trim() : value;

const optionalText = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const toInt = ({ value }: Raw) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const toBool = ({ value }: Raw) => {
  if (value === undefined || value === null || typeof value === 'boolean')
    return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') return undefined;
    if (['true', '1', 'on', 'yes', 'si'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }
  return value;
};

const maxLength = (field: string, max: number) =>
  MaxLength(max, { message: `${field} puede tener hasta ${max} caracteres` });

export class CreateCalendarDateDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El slug', 120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'El slug solo puede tener letras minúsculas sin tildes, números y guiones',
  })
  slug?: string | null;

  @Transform(trimText)
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 150)
  title!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El subtítulo', 200)
  subtitle?: string | null;

  @Transform(toInt)
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  month!: number;

  @Transform(toInt)
  @IsInt({ message: 'El día debe ser un número entero' })
  @Min(1, { message: 'El día debe estar entre 1 y 31' })
  @Max(31, { message: 'El día debe estar entre 1 y 31' })
  day!: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1000, { message: 'El año debe estar entre 1000 y 2100' })
  @Max(2100, { message: 'El año debe estar entre 1000 y 2100' })
  year?: number | null;

  @Transform(trimText)
  @IsIn(CALENDAR_CATEGORIES, {
    message: `La categoría debe ser una de: ${CALENDAR_CATEGORIES.join(', ')}`,
  })
  category!: CalendarCategory;

  @Transform(trimText)
  @IsString({ message: 'El resumen es obligatorio' })
  @MinLength(10, { message: 'El resumen debe tener al menos 10 caracteres' })
  @maxLength('El resumen', 600)
  summary!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La historia', 10000)
  story?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La frase', 600)
  quote?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El autor de la frase', 120)
  quoteAuthor?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El reto', 600)
  challenge?: string | null;

  // Ruta local (/images/...) o URL https; si se sube "image", esta se ignora
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL de la imagen', 500)
  @Matches(/^(\/images\/|https:\/\/)\S+$/, {
    message: 'La imagen debe ser una ruta /images/... o una URL https',
  })
  imageUrl?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La fuente', 1000)
  source?: string | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'verified debe ser true o false' })
  verified?: boolean;

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
