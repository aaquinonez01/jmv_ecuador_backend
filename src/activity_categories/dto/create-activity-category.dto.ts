import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateActivityCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(140)
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(48)
  icon?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

