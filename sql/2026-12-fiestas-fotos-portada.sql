-- Fotos del mural elegidas para el recuerdo de la portada. Idempotente.
ALTER TABLE "fiesta_photos" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;
