-- Puntos JMV (fase 1): perfil de miembro, libro de movimientos y reglas.
-- Idempotente (lo ejecuta jmv-ops.sh deploy). Las reglas se insertan una sola
-- vez: lo que el Consejo cambie después en el admin no se pisa.

-- Miembro de JMV: sección por edad y verificación (necesaria para canjear)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "level" varchar(20);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "memberStatus" varchar(12) NOT NULL DEFAULT 'none';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "memberRequestedAt" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "memberVerifiedAt" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pointsBalance" int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "idx_user_member_status" ON "user" ("memberStatus");

-- Libro de movimientos: solo se agregan filas; el saldo sale de aquí
CREATE TABLE IF NOT EXISTS "points_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "amount" int NOT NULL,
  "reason" varchar(20) NOT NULL,
  "description" text NOT NULL,
  "refId" uuid,
  "createdById" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_points_tx_user" ON "points_transactions" ("userId", "createdAt" DESC);
-- Un mismo motivo no se paga dos veces por la misma referencia (p. ej. una sesión de quiz)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_points_tx_ref" ON "points_transactions" ("userId", "reason", "refId") WHERE "refId" IS NOT NULL;

-- Reglas configurables desde el admin
CREATE TABLE IF NOT EXISTS "points_rules" (
  "key" varchar(40) PRIMARY KEY,
  "label" text NOT NULL,
  "hint" text,
  "points" int NOT NULL,
  "displayOrder" int NOT NULL DEFAULT 0
);
INSERT INTO "points_rules" ("key", "label", "hint", "points", "displayOrder") VALUES
  ('quiz_participacion', 'Participar en un quiz en vivo', 'Se da si respondió al menos una pregunta.', 10, 1),
  ('quiz_primero', 'Quiz en vivo: 1.er lugar', 'Bono extra; solo si participan 3 o más personas.', 30, 2),
  ('quiz_segundo', 'Quiz en vivo: 2.º lugar', 'Bono extra; solo si participan 3 o más personas.', 20, 3),
  ('quiz_tercero', 'Quiz en vivo: 3.er lugar', 'Bono extra; solo si participan 3 o más personas.', 10, 4),
  ('quiz_tope_diario', 'Tope diario por quiz en vivo', 'Lo máximo que una persona puede ganar al día con quiz en vivo.', 100, 5)
ON CONFLICT ("key") DO NOTHING;
