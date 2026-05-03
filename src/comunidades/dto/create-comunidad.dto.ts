import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateComunidadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ciudad!: string;

  @IsEmail()
  @IsNotEmpty()
  correoElectronico!: string;

  @IsUUID()
  zonaId!: string;
}

