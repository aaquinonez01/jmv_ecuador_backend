-- Enseñanzas de "¿Qué quieres aprender hoy?" en la app (cómo rezar el rosario, lectio divina…). Idempotente.
CREATE TABLE IF NOT EXISTS "teachings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "needs" jsonb NOT NULL DEFAULT '[]',
  "steps" jsonb NOT NULL DEFAULT '[]',
  "groupSteps" jsonb NOT NULL DEFAULT '[]',
  "source" text,
  "guide" varchar(12) NOT NULL DEFAULT 'pasos',
  "icon" varchar(40),
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_teachings_order" ON "teachings" ("published", "displayOrder");
