import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ORIGENES_CONTACTO,
  type OrigenContacto,
} from '../entities/contact-message.entity';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactMessageDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El asunto debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El asunto no puede superar los 150 caracteres' })
  asunto: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(3000, {
    message: 'El mensaje no puede superar los 3000 caracteres',
  })
  mensaje: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  telefono?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ciudad no puede superar los 100 caracteres' })
  ciudad?: string;

  @IsOptional()
  @IsIn(ORIGENES_CONTACTO, { message: 'Origen no válido' })
  origen?: OrigenContacto;

  // Honeypot: campo oculto en el formulario; solo los bots lo rellenan
  @IsOptional()
  @IsString()
  website?: string;
}
