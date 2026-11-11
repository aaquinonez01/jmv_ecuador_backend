import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { GAME_CATEGORIES, GAME_LEVELS } from '../game.constants';

export class CreateMatchDto {
  @IsOptional()
  @IsUUID()
  friendId?: string;

  @IsOptional()
  @IsBoolean()
  random?: boolean;
}

export class CrownDto {
  @IsIn(GAME_CATEGORIES)
  category!: string;
}

export class AnswerDto {
  @IsUUID()
  turnId!: string;

  /** null = se acabó el tiempo */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  index?: number | null;
}

export class PracticeDto {
  @IsInt()
  @Min(0)
  @Max(500)
  correct!: number;

  @IsInt()
  @Min(1)
  @Max(500)
  total!: number;
}

export class PackQueryDto {
  @IsOptional()
  @IsDateString()
  since?: string;
}

export class UpsertQuestionDto {
  @IsIn(GAME_CATEGORIES)
  category!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(GAME_LEVELS, { each: true })
  levels!: string[];

  @IsInt()
  @Min(1)
  @Max(3)
  difficulty!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  explanation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;
}

export class AdminUpsertQuestionDto extends UpsertQuestionDto {
  @IsOptional()
  @IsIn(['approved', 'pending', 'rejected'])
  status?: string;
}

export class ListQuestionsDto {
  @IsOptional()
  @IsIn(GAME_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(['approved', 'pending', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
