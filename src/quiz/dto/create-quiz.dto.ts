import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateQuizQuestionOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  text!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuizQuestionDto {
  @IsString()
  @MinLength(2)
  prompt!: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionOptionDto)
  options!: CreateQuizQuestionOptionDto[];
}

export class CreateQuizDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  difficulty!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  gradColors?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  secondsPerQuestion?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions!: CreateQuizQuestionDto[];
}
