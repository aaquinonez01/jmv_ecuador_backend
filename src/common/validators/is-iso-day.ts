import { ValidateBy, type ValidationOptions } from 'class-validator';

// Fecha solo día en formato ISO (AAAA-MM-DD) que exista en el calendario
export function isIsoDay(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function IsIsoDay(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isIsoDay',
      validator: {
        validate: (value: unknown) => isIsoDay(value),
        defaultMessage: () =>
          '$property debe ser una fecha válida con el formato AAAA-MM-DD',
      },
    },
    options,
  );
}

// Hoy (solo día) en la hora de Ecuador continental
export function todayInGuayaquil(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
