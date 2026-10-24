-- Tabla del "Año Vicenciano": fechas fijas de JMV y de la Familia Vicenciana,
-- editables desde el panel de administración.
-- Mismos nombres (tabla, columnas, PK/UQ/CHECK e índices) que generaría TypeORM
-- a partir de la entidad CalendarDate.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-calendario-vicenciano.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- category: 'maria' | 'fundadores' | 'santos' | 'familia' | 'jmv' | 'ecuador'
CREATE TABLE IF NOT EXISTS "calendar_dates" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(120) NOT NULL,
  "title" character varying(150) NOT NULL,
  "subtitle" character varying(200),
  "month" smallint NOT NULL,
  "day" smallint NOT NULL,
  "year" integer,
  "category" character varying(20) NOT NULL,
  "summary" text NOT NULL,
  "story" text,
  "quote" text,
  "quoteAuthor" character varying(120),
  "challenge" text,
  "imageUrl" text,
  "imagePublicId" text,
  "source" text,
  "verified" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_dc6a9a5b3682501b30066e1bc70" UNIQUE ("slug"),
  CONSTRAINT "chk_calendar_dates_month" CHECK ("month" BETWEEN 1 AND 12),
  CONSTRAINT "chk_calendar_dates_day" CHECK ("day" BETWEEN 1 AND 31),
  CONSTRAINT "PK_fea4b8169938b506b1144b6de39" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_calendar_dates_published_order" ON "calendar_dates" ("published", "month", "day", "displayOrder");

-- SEMILLA
-- Fechas iniciales (las mismas de src/calendar_dates/seed/calendar-dates.seed.ts).
-- ON CONFLICT (slug) DO NOTHING: no pisa lo que se haya editado desde el admin.
--
-- INSERT INTO "calendar_dates"
--   ("slug", "title", "subtitle", "month", "day", "year", "category", "summary",
--    "story", "quote", "quoteAuthor", "challenge", "imageUrl", "source",
--    "verified", "published", "displayOrder")
-- VALUES
--   (...)
-- ON CONFLICT ("slug") DO NOTHING;

COMMIT;
