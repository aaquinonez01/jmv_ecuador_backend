-- Tablas de la "Biblioteca JMV": libros, documentos y guías de formación que se
-- suben desde el panel de administración, y las rutas de formación (lecturas
-- en orden).
-- Mismos nombres (tablas, columnas, PK/UQ/FK e índices) que genera TypeORM a
-- partir de las entidades LibraryDocument, LibraryCollection y
-- LibraryCollectionItem.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-biblioteca.sql
--
-- Los PDF no van en la base: se guardan en el volumen Docker "library_files"
-- (LIBRARY_STORAGE_DIR=/app/uploads/library). Inclúyelo en los respaldos.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- kind: 'pdf' | 'enlace' | 'video'
-- type: 'libro' | 'documento' | 'guia' | 'oracion' | 'otro'
-- axis: 'humano' | 'cristocentrico' | 'mariano' | 'vicenciano' | 'eclesial'
-- stage: 'aspirante' | 'promesa' | 'consagrado' | 'animador' | 'todos'
-- visibility: 'publico' | 'miembros'
-- filePath: nombre interno del PDF (uuid.pdf) dentro de LIBRARY_STORAGE_DIR
CREATE TABLE IF NOT EXISTS "library_documents" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(140) NOT NULL,
  "title" character varying(200) NOT NULL,
  "author" character varying(200),
  "summary" text NOT NULL,
  "description" text,
  "kind" character varying(10) NOT NULL,
  "type" character varying(20) NOT NULL,
  "axis" character varying(20),
  "stage" character varying(20) NOT NULL DEFAULT 'todos',
  "tags" text array NOT NULL DEFAULT '{}',
  "visibility" character varying(10) NOT NULL DEFAULT 'publico',
  "coverUrl" text,
  "coverPublicId" text,
  "externalUrl" text,
  "filePath" character varying(64),
  "fileName" character varying(255),
  "fileSize" integer,
  "fileMime" character varying(100),
  "pageCount" integer,
  "readingMinutes" integer,
  "featured" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "views" integer NOT NULL DEFAULT 0,
  "downloads" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_24b8d4167f4137b8172db78eb5f" UNIQUE ("slug"),
  CONSTRAINT "PK_53886c1f7e0fc1140fb12be4e9c" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_library_documents_published_order" ON "library_documents" ("published", "featured", "displayOrder");

CREATE TABLE IF NOT EXISTS "library_collections" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(140) NOT NULL,
  "title" character varying(200) NOT NULL,
  "description" text,
  "coverUrl" text,
  "coverPublicId" text,
  "published" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_886fb7d7c4c62403dea38aee6be" UNIQUE ("slug"),
  CONSTRAINT "PK_8aba9319954e12562aa6bf21732" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_library_collections_published_order" ON "library_collections" ("published", "displayOrder");

CREATE TABLE IF NOT EXISTS "library_collection_items" (
  "collectionId" uuid NOT NULL,
  "documentId" uuid NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_c37b5f6a73e5518f31fb955a5d5" PRIMARY KEY ("collectionId", "documentId"),
  CONSTRAINT "FK_83dc5561adda88610ab18efbe26" FOREIGN KEY ("collectionId") REFERENCES "library_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_1c256be2924ad135282f0091c95" FOREIGN KEY ("documentId") REFERENCES "library_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_library_collection_items_document" ON "library_collection_items" ("documentId");

COMMIT;
