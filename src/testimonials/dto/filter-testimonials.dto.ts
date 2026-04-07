import { IsOptional, IsString } from 'class-validator';

export class FilterTestimonialsDto {
  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;

  @IsOptional()
  @IsString()
  active?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
