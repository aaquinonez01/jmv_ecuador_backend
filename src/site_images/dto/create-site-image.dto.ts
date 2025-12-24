import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateSiteImageDto {
  @IsString()
  @IsNotEmpty()
  section: string;

  @IsString()
  @IsOptional()
  subsection?: string;

  @IsString()
  @IsNotEmpty()
  alt: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsObject()
  @IsOptional()
  eventData?: {
    date?: string;
    location?: string;
    status?: string;
  };

  @IsObject()
  @IsOptional()
  personData?: {
    name?: string;
    role?: string;
    zone?: string;
  };

  @IsString()
  @IsOptional()
  groupId?: string;
}
