import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  participantsLabel?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  // Toda actividad pertenece a uno de los cuatro pilares (catálogo activity_pillars)
  @IsUUID('all', { message: 'Elige el pilar al que pertenece la actividad' })
  pillarId!: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsString()
  published?: string;

  @IsOptional()
  @IsString()
  featured?: string;

  @IsOptional()
  @IsString()
  showInActivitiesPage?: string;

  @IsOptional()
  @IsString()
  displayOrder?: string;
}
