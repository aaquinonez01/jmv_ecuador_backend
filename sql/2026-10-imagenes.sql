-- Fotos administrables de la web ("espacios de foto": portada del inicio,
-- cabeceras de cada página, galerías…), editables desde /admin/imagenes.
-- Mismos nombres (tabla, columnas, PK e índice) que genera TypeORM a partir de
-- la entidad SiteImage.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: crea la tabla si no existe y, si ya existía, añade las
-- columnas que falten (alt y publicId). Se puede ejecutar varias veces.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-imagenes.sql
--
-- section: id del espacio, "<página>.<uso>" (p. ej. "home.hero"); lo valida la API.
-- alt: texto alternativo obligatorio (accesibilidad).
-- publicId: public_id de Cloudinary, para borrar el archivo al eliminar la foto.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

CREATE TABLE IF NOT EXISTS "site_image" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "section" text NOT NULL,
  "subsection" text,
  "url" text NOT NULL,
  "publicId" text,
  "filename" text NOT NULL,
  "alt" text NOT NULL,
  "title" text,
  "description" text,
  "orden" integer NOT NULL DEFAULT 1,
  "activo" boolean NOT NULL DEFAULT true,
  "metadata" jsonb,
  "eventData" jsonb,
  "personData" jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_2cf835416ef9aef58ba08c3f3f1" PRIMARY KEY ("id")
);

-- Tablas creadas con una versión anterior de la entidad
ALTER TABLE "site_image" ADD COLUMN IF NOT EXISTS "publicId" text;
ALTER TABLE "site_image" ADD COLUMN IF NOT EXISTS "alt" text NOT NULL DEFAULT '';
ALTER TABLE "site_image" ALTER COLUMN "alt" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "idx_site_image_section"
  ON "site_image" ("section", "subsection", "orden");

COMMIT;
