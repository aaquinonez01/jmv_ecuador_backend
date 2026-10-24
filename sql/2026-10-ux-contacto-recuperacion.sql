-- Tablas para el formulario de contacto / "Únete" y la recuperación de contraseña.
-- Mismos nombres (tablas, columnas, PK/FK/UQ e índices) que generaría TypeORM a
-- partir de las entidades ContactMessage y PasswordResetToken.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-ux-contacto-recuperacion.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- Mensajes de los formularios públicos (origen: 'contacto' | 'unete')
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "nombre" character varying(100) NOT NULL,
  "email" character varying(254) NOT NULL,
  "asunto" character varying(150) NOT NULL,
  "mensaje" text NOT NULL,
  "telefono" character varying(30),
  "ciudad" character varying(100),
  "origen" character varying(20) NOT NULL DEFAULT 'contacto',
  "leido" boolean NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PK_b74f96eb2edd977ccfba6533293" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_contact_messages_leido_created" ON "contact_messages" ("leido", "createdAt");

-- Tokens de recuperación de contraseña: solo se guarda el hash sha256
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "tokenHash" character varying(64) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" uuid NOT NULL,
  CONSTRAINT "UQ_1143abb8c3fad8b06dd857a8c9c" UNIQUE ("tokenHash"),
  CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user" ON "password_reset_tokens" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_d6a19d4b4f6c62dcd29daa497e2'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Momento del último cambio de contraseña: invalida los JWT emitidos antes
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP;

COMMIT;
