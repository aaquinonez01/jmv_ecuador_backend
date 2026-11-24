-- Fiestas: consagración del día de la fiesta (una por persona). Idempotente.
CREATE TABLE IF NOT EXISTS "fiesta_consecrations" (
  "fiestaId" uuid NOT NULL REFERENCES "fiestas"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("fiestaId", "userId")
);
