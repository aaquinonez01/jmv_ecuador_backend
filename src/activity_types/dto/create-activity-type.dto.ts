import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateActivityTypeDto {
  @IsString()
  name: string;

  @IsUUID('all', { message: 'Elige el pilar al que pertenece este tipo' })
  pillarId!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
