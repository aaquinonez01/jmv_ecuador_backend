import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUpcomingActivityDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  maxRegistrationDate?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsString()
  participantsLabel?: string;

  @IsOptional()
  @IsString()
  registrationStatus?: string;

  @IsOptional()
  @IsString()
  countdownTargetType?: string;

  @IsOptional()
  @IsString()
  pillarId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsString()
  published?: string;

  @IsOptional()
  @IsString()
  featuredInHome?: string;

  @IsOptional()
  @IsString()
  showInHome?: string;

  @IsOptional()
  @IsString()
  displayOrder?: string;

  @IsOptional()
  @IsString()
  documentTypes?: string;
}
