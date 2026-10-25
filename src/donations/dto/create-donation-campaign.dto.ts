import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { IsIsoDay } from 'src/common/validators/is-iso-day';
import {
  maxLength,
  optionalText,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  toBool,
  toInt,
  trimText,
} from 'src/library/dto/transforms';
import {
  AmountField,
  IMAGE_URL_MESSAGE,
  IMAGE_URL_PATTERN,
} from './donation-transforms';

export const DONATION_CURRENCIES = ['USD'] as const;

export class CreateDonationCampaignDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El slug', 120)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string | null;

  @Transform(trimText)
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 150)
  title!: string;

  @Transform(trimText)
  @IsString({ message: 'La descripción es obligatoria' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @maxLength('La descripción', 2000)
  description!: string;

  @AmountField('La meta')
  goalAmount?: number | null;

  @AmountField('Lo recaudado')
  raisedAmount?: number | null;

  @IsOptional()
  @Transform(trimText)
  @IsIn(DONATION_CURRENCIES, {
    message: 'Por ahora la moneda solo puede ser USD',
  })
  currency?: string;

  // Ruta local o URL https; si se sube "image", esta se ignora
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL de la imagen', 500)
  @Matches(IMAGE_URL_PATTERN, { message: IMAGE_URL_MESSAGE })
  imageUrl?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsIsoDay({ message: 'La fecha de inicio debe tener el formato AAAA-MM-DD' })
  startsAt?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsIsoDay({ message: 'La fecha de cierre debe tener el formato AAAA-MM-DD' })
  endsAt?: string | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe estar entre 0 y 9999' })
  @Max(9999, { message: 'El orden debe estar entre 0 y 9999' })
  displayOrder?: number | null;
}
