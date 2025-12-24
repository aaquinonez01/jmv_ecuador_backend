import { IsOptional, IsString, MinLength, IsDate } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  displayName?: string;

  @IsOptional()
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @MinLength(10)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  bio?: string;
}

