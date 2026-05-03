import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoAnnouncement } from '../entities/home-announcement.entity';

export class CreateHomeAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  subtitulo?: string;

  @IsString()
  @MinLength(10)
  mensaje!: string;

  @IsOptional()
  @IsEnum(TipoAnnouncement)
  tipo?: TipoAnnouncement;

  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsDateString()
  fechaPublicacion?: string;

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;

  @IsOptional()
  @IsString()
  displayOrder?: string;

  @IsOptional()
  @IsString()
  featuredInHome?: string;

  @IsOptional()
  @IsString()
  active?: string;
}
