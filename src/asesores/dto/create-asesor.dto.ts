import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoAsesor } from '../entities/asesor.entity';

export class CreateAsesorDto {
  @IsEnum(TipoAsesor)
  tipo!: TipoAsesor;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cargo!: string;

  @IsOptional()
  @IsString()
  comunidad?: string;

  @IsOptional()
  @IsString()
  santoFavorito?: string;

  @IsOptional()
  @IsString()
  citaBiblica?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsDateString()
  fechaInicio!: string;

  @IsDateString()
  fechaFin!: string;

  @IsOptional()
  @IsString()
  active?: string;
}
