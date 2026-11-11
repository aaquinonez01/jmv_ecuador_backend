import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
  ValidateNested,
} from 'class-validator';

export const MEMBER_LEVELS = ['infancia', 'prejuvenil', 'juvenil'] as const;
export const MEMBER_STATUSES = [
  'none',
  'pending',
  'verified',
  'rejected',
] as const;

export class MemberRequestDto {
  @IsUUID()
  comunidadId!: string;

  @IsIn(MEMBER_LEVELS)
  level!: string;
}

export class ListMembersDto {
  @IsOptional()
  @IsIn(MEMBER_STATUSES)
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

export class ReviewMemberDto {
  @IsIn(['verified', 'rejected', 'none'])
  status!: string;

  @IsOptional()
  @IsIn(MEMBER_LEVELS)
  level?: string;

  @IsOptional()
  @IsUUID()
  comunidadId?: string;
}

export class AdjustPointsDto {
  @IsInt()
  @NotEquals(0)
  @Min(-100000)
  @Max(100000)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description!: string;
}

export class PageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

class RuleValueDto {
  @IsString()
  @MaxLength(40)
  key!: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  points!: number;
}

export class UpdateRulesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RuleValueDto)
  rules!: RuleValueDto[];
}
