import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateActivityTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}
