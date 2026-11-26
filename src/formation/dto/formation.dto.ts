import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
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
  SONG_CATEGORIES,
  QUOTE_KINDS,
  TEACHING_GUIDES,
  THEME_AXES,
} from '../entities/formation.entities';
import type {
  FormationAxis,
  FormationLevel,
  MaterialType,
  PrayerCategory,
  ReferenceType,
  SongCategory,
  QuoteKind,
  TeachingGuide,
  ThemeAxis,
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

export class UpsertSongDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @IsIn(SONG_CATEGORIES)
  category: SongCategory;

  @IsString()
  @MinLength(5)
  @MaxLength(12000)
  lyrics: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  songKey?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(400)
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class TeachingStepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @IsString()
  @MaxLength(6000)
  text: string;
}

export class UpsertTeachingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  summary: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  needs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => TeachingStepDto)
  steps?: TeachingStepDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => TeachingStepDto)
  groupSteps?: TeachingStepDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  source?: string;

  @IsOptional()
  @IsIn(TEACHING_GUIDES)
  guide?: TeachingGuide;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class ThemeQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  context?: string;

  @IsIn(QUOTE_KINDS)
  kind: QuoteKind;

  @IsString()
  @MinLength(3)
  @MaxLength(3000)
  text: string;

  @IsString()
  @MaxLength(200)
  reference: string;
}

export class UpsertThemeDto {
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'El identificador solo lleva minúsculas sin tildes, números y guiones.' })
  @MinLength(2)
  @MaxLength(60)
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsIn(THEME_AXES)
  axis: ThemeAxis;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gameCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => ThemeQuoteDto)
  quotes?: ThemeQuoteDto[];

  /** Recorrido para profundizar; si no se envía, se conserva el que ya tiene el tema */
  @IsOptional()
  @IsObject()
  journey?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpsertMoodDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1500)
  word: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reference: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  prayer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
