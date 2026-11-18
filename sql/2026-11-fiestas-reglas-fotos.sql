-- Fiestas: horario para subir fotos y permiso especial por comunidad. Idempotente.
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "photoStartHour" smallint;
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "photoEndHour" smallint;
ALTER TABLE "fiesta_community_modes" ADD COLUMN IF NOT EXISTS "openUntil" timestamptz;
