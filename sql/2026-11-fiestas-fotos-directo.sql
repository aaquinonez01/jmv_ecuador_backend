-- Fiestas: las fotos salen directo al mural (ya no hay revisión previa). Idempotente.
UPDATE "fiesta_photos" SET "status" = 'approved' WHERE "status" = 'pending';
