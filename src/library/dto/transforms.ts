import { MaxLength } from 'class-validator';

// Los formularios multipart envían todo como texto: estas funciones convierten
// los valores antes de validar. Un texto vacío en un campo opcional = null.
type Raw = { value: unknown };

export const trimText = ({ value }: Raw) =>
  typeof value === 'string' ? value.trim() : value;

export const optionalText = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const toInt = ({ value }: Raw) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

export const toBool = ({ value }: Raw) => {
  if (value === undefined || value === null || typeof value === 'boolean')
    return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') return undefined;
    if (['true', '1', 'on', 'yes', 'si'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }
  return value;
};

const parseList = (value: unknown): unknown => {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
  return trimmed.split(',');
};

// "a, b" o '["a","b"]' -> ['a', 'b'] (sin vacíos ni repetidos)
export const toTags = ({ value }: Raw) => {
  const list = parseList(value);
  if (!Array.isArray(list)) return list;
  const seen = new Set<string>();
  for (const tag of list as unknown[]) {
    if (typeof tag !== 'string') return list as unknown[];
    const clean = tag.trim().replace(/\s+/g, ' ');
    if (clean) seen.add(clean.toLowerCase());
  }
  return [...seen];
};

// Igual que toTags pero conserva el orden y no cambia mayúsculas (ids)
export const toIdList = ({ value }: Raw) => {
  const list = parseList(value);
  if (!Array.isArray(list)) return list;
  return (list as unknown[]).map((id: unknown) =>
    typeof id === 'string' ? id.trim() : id,
  );
};

export const maxLength = (field: string, max: number) =>
  MaxLength(max, { message: `${field} puede tener hasta ${max} caracteres` });

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE =
  'El slug solo puede tener letras minúsculas sin tildes, números y guiones';
