-- Fiestas: interruptor para dejar subir fotos antes de que empiecen los días (pruebas). Idempotente.
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "earlyPhotos" boolean NOT NULL DEFAULT false;
