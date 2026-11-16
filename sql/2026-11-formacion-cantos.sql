-- Cantos de la pestaña "Orar y cantar" de la app. Idempotente.
CREATE TABLE IF NOT EXISTS "songs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "author" text,
  "category" varchar(30) NOT NULL,
  "lyrics" text NOT NULL,
  "songKey" varchar(12),
  "videoUrl" text,
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_songs_order" ON "songs" ("published", "category", "title");
