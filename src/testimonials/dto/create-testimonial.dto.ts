import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1200)
  quote: string;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  active?: string;

  @IsOptional()
  @IsString()
  displayOrder?: string;
}
