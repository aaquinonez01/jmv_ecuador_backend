import { Matches, MaxLength } from 'class-validator';

// Identificador de un "espacio de foto" de la web (p. ej. "home.hero",
// "quienes-somos.mision"): minúsculas y números separados por puntos o guiones.
export const SECTION_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
export const SECTION_MAX = 60;
export const ALT_MAX = 300;

type Raw = { value: unknown };

export const trimText = ({ value }: Raw) =>
  typeof value === 'string' ? value.trim() : value;

export const optionalText = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const toInt = ({ value }: Raw) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string' && value.trim() === '') return undefined;
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

// Los campos JSON llegan como texto en multipart
export const toObject = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const IsSection = (field = 'El espacio') =>
  function (target: object, key: string) {
    MaxLength(SECTION_MAX, {
      message: `${field} puede tener hasta ${SECTION_MAX} caracteres`,
    })(target, key);
    Matches(SECTION_PATTERN, {
      message: `${field} solo admite minúsculas, números, puntos y guiones (p. ej. "home.hero")`,
    })(target, key);
  };
