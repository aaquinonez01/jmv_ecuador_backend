export interface StatuteSeed {
  slug: string;
  title: string;
  versionLabel: string;
  approvedAt: string;
  approvedBy: string;
  summary?: string | null;
  content: string;
  pdfUrl?: string | null;
  isCurrent?: boolean;
  published?: boolean;
}

// Versiones iniciales de los Estatutos Nacionales. Solo se insertan en
// desarrollo cuando la tabla está vacía; en producción van en
// sql/2026-10-estatutos-donaciones.sql.
export const STATUTES_SEED: StatuteSeed[] = [];
