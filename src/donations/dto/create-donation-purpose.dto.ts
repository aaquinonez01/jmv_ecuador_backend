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
import {
  maxLength,
  optionalText,
  toBool,
  toInt,
  trimText,
} from 'src/library/dto/transforms';
import {
  DONATION_PURPOSE_ICONS,
  type DonationPurposeIcon,
} from '../entities/donation-purpose.entity';
import { IMAGE_URL_MESSAGE, IMAGE_URL_PATTERN } from './donation-transforms';

export class CreateDonationPurposeDto {
  @Transform(trimText)
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 120)
  title!: string;

  @Transform(trimText)
  @IsString({ message: 'La descripción es obligatoria' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @maxLength('La descripción', 600)
  description!: string;

  @IsOptional()
  @Transform(trimText)
  @IsIn(DONATION_PURPOSE_ICONS, {
    message: `El icono debe ser uno de: ${DONATION_PURPOSE_ICONS.join(', ')}`,
  })
  icon?: DonationPurposeIcon;

  // Ruta local o URL https; si se sube "image", esta se ignora
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL de la imagen', 500)
  @Matches(IMAGE_URL_PATTERN, { message: IMAGE_URL_MESSAGE })
  imageUrl?: string | null;

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
