-- Testimonios largos: título y texto completo (opcionales). Idempotente.
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "story" text;
