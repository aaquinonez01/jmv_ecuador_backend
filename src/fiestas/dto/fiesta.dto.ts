import { Transform, Type } from 'class-transformer';
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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  FIESTA_MODES,
  PHOTO_STATUS,
  REACTIONS,
  SYMBOL_KINDS,
  type FiestaMode,
  type PhotoStatus,
  type Reaction,
  type SymbolKind,
} from '../entities/fiesta.entities';

const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class AnswersDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(9, { each: true })
  answers!: number[];
}

export class ModeDto {
  @IsIn(FIESTA_MODES)
  mode!: FiestaMode;
}

export class ReactDto {
  @IsIn(REACTIONS)
  emoji!: Reaction;
}

export class PhotoUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimOrNull)
  caption?: string | null;
}

// ── Admin ──

export class UpdateFiestaDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimOrNull)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(trimOrNull)
  intro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @Transform(trimOrNull)
  dailyPrayers?: string | null;

  @IsOptional()
  @IsDateString()
  feastDate?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  earlyPhotos?: boolean;

  @IsOptional()
  @IsIn(SYMBOL_KINDS)
  symbolKind?: SymbolKind;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trimOrNull)
  symbolName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimOrNull)
  symbolImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(trimOrNull)
  pieceWord?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(trimOrNull)
  piecesWord?: string | null;
}

export class CreateFiestaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  /** Va en la dirección: /fiestas/adviento */
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'La dirección solo lleva minúsculas sin tildes, números y guiones.',
  })
  @MinLength(3)
  @MaxLength(60)
  slug!: string;

  @IsDateString()
  feastDate!: string;

  @IsIn(SYMBOL_KINDS)
  symbolKind!: SymbolKind;
}

export class CreateDayDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string;
}

export class QuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  id?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(400)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  @Max(5)
  correctIndex!: number;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  @Transform(trimOrNull)
  explanation?: string | null;
}

export class UpdateDayDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  piece?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trimOrNull)
  pieceName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimOrNull)
  layerImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @Transform(trimOrNull)
  theme?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(trimOrNull)
  prayer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  purpose?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trimOrNull)
  source?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PhotoStatusDto {
  @IsIn(PHOTO_STATUS)
  status!: PhotoStatus;
}

export class PhotosQueryDto {
  @IsOptional()
  @IsIn(PHOTO_STATUS)
  status?: PhotoStatus;
}

export class LeadsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsUUID()
  comunidadId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyLeads?: boolean;
}

export class LeadDto {
  @IsBoolean()
  lead!: boolean;
}
