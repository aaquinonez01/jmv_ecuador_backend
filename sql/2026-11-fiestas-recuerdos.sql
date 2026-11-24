-- Fiestas: la foto de recuerdo de cada joven con su medalla (una por persona). Idempotente.
CREATE TABLE IF NOT EXISTS "fiesta_keepsakes" (
  "fiestaId" uuid NOT NULL REFERENCES "fiestas"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "publicId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("fiestaId", "userId")
);
