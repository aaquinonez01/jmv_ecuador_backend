-- Anuncios: mostrar como ventana al entrar a la portada. Idempotente.
ALTER TABLE "home_announcements" ADD COLUMN IF NOT EXISTS "showAsPopup" boolean NOT NULL DEFAULT false;
