import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FORMATION_PILLARS, FORMATION_STEPS } from '../entities/formation-encounter.entity';
import type { FormationPillar, FormationStep } from '../entities/formation-encounter.entity';

class ContemplarDto {
  @IsOptional() @IsString() @MaxLength(120)
  passageRef?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  passageText?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  prayer?: string;
}

class VivirCardDto {
  @IsOptional() @IsString() @MaxLength(160)
  title?: string;

  @IsString() @MinLength(1) @MaxLength(3000)
  body: string;
}

class VivirDto {
  @IsArray() @ArrayMaxSize(12)
  @ValidateNested({ each: true }) @Type(() => VivirCardDto)
  cards: VivirCardDto[];

  @IsOptional() @IsUrl({ require_protocol: true })
  videoUrl?: string;

  @IsOptional() @IsString() @MaxLength(200)
  documentSlug?: string;
}

class ServirDto {
  @IsString() @MaxLength(1000)
  commitment: string;
}

class QuizQuestionDto {
  @IsString() @MinLength(3) @MaxLength(300)
  question: string;

  @IsArray() @ArrayMaxSize(5)
  @IsString({ each: true }) @MaxLength(200, { each: true })
  options: string[];

  @IsInt() @Min(0) @Max(4)
  correct: number;

  @IsOptional() @IsString() @MaxLength(600)
  explanation?: string;
}

export class UpsertEncounterDto {
  @IsString() @MinLength(3) @MaxLength(160)
  title: string;

  @IsOptional() @IsString() @MaxLength(500)
  summary?: string;

  @IsIn(FORMATION_STEPS)
  step: FormationStep;

  @IsOptional() @IsIn(FORMATION_PILLARS)
  pillar?: FormationPillar | null;

  @IsOptional() @IsInt() @Min(0) @Max(999)
  displayOrder?: number;

  @IsOptional() @IsInt() @Min(5) @Max(120)
  durationMinutes?: number;

  @IsOptional() @IsUrl({ require_protocol: true })
  coverImageUrl?: string | null;

  @ValidateNested() @Type(() => ContemplarDto)
  contemplar: ContemplarDto;

  @ValidateNested() @Type(() => VivirDto)
  vivir: VivirDto;

  @ValidateNested() @Type(() => ServirDto)
  servir: ServirDto;

  @IsArray() @ArrayMaxSize(8)
  @IsString({ each: true }) @MaxLength(400, { each: true })
  reflectionQuestions: string[];

  @IsArray() @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => QuizQuestionDto)
  quiz: QuizQuestionDto[];

  @IsOptional() @IsString() @MaxLength(200)
  source?: string;

  @IsOptional() @IsBoolean()
  published?: boolean;
}

export class CompleteEncounterDto {
  @IsOptional() @IsInt() @Min(0) @Max(10)
  quizScore?: number;
}
