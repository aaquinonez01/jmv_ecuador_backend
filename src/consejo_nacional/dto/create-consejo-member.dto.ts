import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoCargoConsejo } from '../entities/consejo-member.entity';

export class CreateConsejoMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cargo!: string;

  @IsEnum(TipoCargoConsejo)
  tipoCargo!: TipoCargoConsejo;

  @IsOptional()
  @IsString()
  edad?: string;

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

  @IsOptional()
  @IsDateString()
  fechaPosesion?: string;

  @IsOptional()
  @IsDateString()
  fechaFinCargo?: string;

  @IsOptional()
  @IsString()
  displayOrder?: string;

  @IsOptional()
  @IsString()
  active?: string;
}
