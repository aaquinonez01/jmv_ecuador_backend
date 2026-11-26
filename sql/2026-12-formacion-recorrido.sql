-- Recorrido para profundizar en un tema (pasos, pasajes, personas, libros). Idempotente.
ALTER TABLE "themes" ADD COLUMN IF NOT EXISTS "journey" jsonb;
