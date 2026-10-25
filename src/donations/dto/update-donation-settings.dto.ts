import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';
import { maxLength, optionalText, trimText } from 'src/library/dto/transforms';
import {
  IMAGE_URL_MESSAGE,
  IMAGE_URL_PATTERN,
  RemoveFlag,
  toWhatsapp,
  WhatsappNumber,
} from './donation-transforms';

export class UpdateDonationSettingsDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 150)
  headline?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(10, {
    message: 'La introducción debe tener al menos 10 caracteres',
  })
  @maxLength('La introducción', 2000)
  intro?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(3, {
    message: 'El texto de contacto debe tener al menos 3 caracteres',
  })
  @maxLength('El texto de contacto', 300)
  contactNote?: string;

  @IsOptional()
  @Transform(toWhatsapp)
  @IsString()
  @WhatsappNumber()
  whatsapp?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  @maxLength('El correo', 150)
  email?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'El enlace de PayPal debe ser una URL https' },
  )
  @maxLength('El enlace de PayPal', 500)
  paypalUrl?: string | null;

  // Ruta local o URL https; si se sube "qrImage", esta se ignora
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL del QR', 500)
  @Matches(IMAGE_URL_PATTERN, { message: IMAGE_URL_MESSAGE })
  qrImageUrl?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La etiqueta del QR', 120)
  qrLabel?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La nota de donaciones en especie', 1500)
  inKindNote?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La nota de transparencia', 1500)
  transparencyNote?: string | null;

  // "true" quita el QR actual (y lo borra de Cloudinary si se subió allí)
  @RemoveFlag()
  removeQr?: boolean;
}
