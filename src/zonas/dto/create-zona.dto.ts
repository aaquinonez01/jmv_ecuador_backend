import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateZonaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ciudades!: string[];

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombreCoordinador?: string;
}

