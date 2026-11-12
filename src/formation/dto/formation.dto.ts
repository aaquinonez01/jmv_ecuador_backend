import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  FORMATION_AXES,
  FORMATION_LEVELS,
  MATERIAL_TYPES,
  PRAYER_CATEGORIES,
  REFERENCE_TYPES,
} from '../entities/formation.entities';
import type {
  FormationAxis,
  FormationLevel,
  MaterialType,
  PrayerCategory,
  ReferenceType,
} from '../entities/formation.entities';

const URL_OPTS = { require_protocol: true };

class ReferenceDto {
  @IsIn(REFERENCE_TYPES)
  type: ReferenceType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  url?: string;
}

export class UpsertTopicDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  summary?: string;

  @IsIn(FORMATION_AXES)
  axis: FormationAxis;

  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(FORMATION_LEVELS, { each: true })
  levels: FormationLevel[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  subtopics: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references: ReferenceDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

class MaterialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsIn(MATERIAL_TYPES)
  type: MaterialType;

  @IsOptional()
  @IsUrl(URL_OPTS)
  url?: string;

  // Solo nombres que genera el servidor al subir (uuid.pdf)
  @IsOptional()
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/,
  )
  fileName?: string;
}

export class UpsertTrainingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  speaker?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  meetingUrl?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  recordingUrl?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MaterialDto)
  materials: MaterialDto[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpsertPrayerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsIn(PRAYER_CATEGORIES)
  category: PrayerCategory;

  @IsString()
  @MinLength(5)
  @MaxLength(8000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
