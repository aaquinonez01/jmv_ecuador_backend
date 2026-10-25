import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { IsIsoDay } from 'src/common/validators/is-iso-day';
import {
  maxLength,
  optionalText,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  toBool,
  trimText,
} from 'src/library/dto/transforms';

// El contenido conserva los espacios internos (subviñetas); solo se quitan
// los saltos de línea sobrantes al inicio y al final y se unifican los CRLF.
const normalizeContent = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .replace(/^\s*\n/, '')
        .trimEnd()
    : value;

export class CreateStatuteVersionDto {
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El slug', 120)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string | null;

  @Transform(trimText)
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @maxLength('El título', 200)
  title!: string;

  @Transform(trimText)
  @IsString({ message: 'La etiqueta de la versión es obligatoria' })
  @MinLength(1, { message: 'La etiqueta de la versión es obligatoria' })
  @maxLength('La etiqueta de la versión', 40)
  versionLabel!: string;

  @Transform(trimText)
  @IsIsoDay({
    message: 'La fecha de aprobación debe tener el formato AAAA-MM-DD',
  })
  approvedAt!: string;

  @Transform(trimText)
  @IsString({ message: 'Indica quién aprobó los estatutos' })
  @MinLength(3, { message: 'Indica quién aprobó los estatutos' })
  @maxLength('Quién aprobó', 200)
  approvedBy!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El resumen', 1000)
  summary?: string | null;

  @Transform(normalizeContent)
  @IsString({ message: 'El texto de los estatutos es obligatorio' })
  @MinLength(1, { message: 'El texto de los estatutos es obligatorio' })
  @Matches(/^###[ \t]+Artículo[ \t]/m, {
    message:
      'El texto debe tener al menos un artículo con el formato "### Artículo N · Título"',
  })
  @maxLength('El texto de los estatutos', 500000)
  content!: string;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('La URL del PDF', 500)
  @Matches(/^(\/documentos\/|https:\/\/)\S+$/, {
    message: 'El PDF debe ser una ruta /documentos/... o una URL https',
  })
  pdfUrl?: string | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'isCurrent debe ser true o false' })
  isCurrent?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'published debe ser true o false' })
  published?: boolean;
}
