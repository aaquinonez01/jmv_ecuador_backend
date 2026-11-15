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

  /** Título del testimonio completo (opcional) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  /** Testimonio completo (opcional): se lee en su propia página */
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  story?: string;

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
