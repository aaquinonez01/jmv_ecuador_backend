import type { CalendarCategory } from '../entities/calendar-date.entity';

export interface CalendarDateSeed {
  slug: string;
  title: string;
  subtitle?: string | null;
  month: number;
  day: number;
  year?: number | null;
  category: CalendarCategory;
  summary: string;
  story?: string | null;
  quote?: string | null;
  quoteAuthor?: string | null;
  challenge?: string | null;
  imageUrl?: string | null;
  source?: string | null;
  verified?: boolean;
  published?: boolean;
  displayOrder?: number;
}

// Fechas iniciales del Año Vicenciano. Solo se insertan en desarrollo cuando la
// tabla está vacía; en producción van en sql/2026-10-calendario-vicenciano.sql.
export const CALENDAR_DATES_SEED: CalendarDateSeed[] = [];
