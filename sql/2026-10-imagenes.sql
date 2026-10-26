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

-- Las filas antiguas quedan con alt vacío, y la API pide al menos 3 caracteres.
-- Se rellenan con un texto genérico que incluye el nombre del archivo, para
-- poder reconocerlas y corregirlas desde /admin/imagenes («Editar texto
-- alternativo»). Al final se listan las que conviene revisar.
UPDATE "site_image"
   SET "alt" = 'Foto de JMV Ecuador (' || COALESCE(NULLIF(btrim("filename"), ''), 'sin nombre') || ')'
 WHERE btrim("alt") = '';

CREATE INDEX IF NOT EXISTS "idx_site_image_section"
  ON "site_image" ("section", "subsection", "orden");

COMMIT;

-- Fotos para revisar: texto alternativo genérico, o sin espacio asignado (con
-- subsection o de secciones antiguas). Estas últimas no se muestran en la web y
-- aparecen en el panel en «Sin espacio asignado», donde se pueden eliminar.
SELECT "id", "section", "subsection", "filename", "alt"
  FROM "site_image"
 WHERE "alt" LIKE 'Foto de JMV Ecuador (%'
    OR "subsection" IS NOT NULL
    OR "section" !~ '^[a-z0-9-]+\.[a-z0-9-]+$'
 ORDER BY "section", "orden";
