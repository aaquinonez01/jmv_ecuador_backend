-- Tablas de los Estatutos Nacionales (versiones con historial) y de la página
-- de donaciones (/donar), editables desde el panel de administración.
-- Mismos nombres (tablas, columnas, PK/UQ/CHECK e índices) que genera TypeORM a
-- partir de las entidades StatuteVersion, DonationSettings, DonationAccount,
-- DonationPurpose y DonationCampaign.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-estatutos-donaciones.sql
--
-- Las donaciones son anónimas: no hay ninguna tabla con datos de quien dona.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ESTATUTOS
-- content: Markdown con las convenciones de los estatutos (### Artículo N · Título)
-- pdfUrl: URL https o ruta /documentos/... del original
-- Solo una versión puede estar vigente (índice único parcial sobre isCurrent)
CREATE TABLE IF NOT EXISTS "statute_versions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(120) NOT NULL,
  "title" character varying(200) NOT NULL,
  "versionLabel" character varying(40) NOT NULL,
  "approvedAt" date NOT NULL,
  "approvedBy" character varying(200) NOT NULL,
  "summary" text,
  "content" text NOT NULL,
  "pdfUrl" text,
  "isCurrent" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_3afd76f91e5d6a83812a183f26a" UNIQUE ("slug"),
  CONSTRAINT "PK_2cc1a89b1daa6bc2126d82b5102" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_statute_versions_current" ON "statute_versions" ("isCurrent") WHERE "isCurrent" = true;
CREATE INDEX IF NOT EXISTS "idx_statute_versions_published_approved" ON "statute_versions" ("published", "approvedAt");

-- DONACIONES
-- Fila única (id = 1) con los textos y medios de pago de /donar
-- whatsapp: solo dígitos con código de país (p. ej. 593991234567)
CREATE TABLE IF NOT EXISTS "donation_settings" (
  "id" smallint NOT NULL DEFAULT '1',
  "headline" character varying(150) NOT NULL,
  "intro" text NOT NULL,
  "contactNote" character varying(300) NOT NULL,
  "whatsapp" character varying(20),
  "email" character varying(150),
  "paypalUrl" text,
  "qrImageUrl" text,
  "qrImagePublicId" text,
  "qrLabel" character varying(120),
  "inKindNote" text,
  "transparencyNote" text,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "PK_d1a5345b6d2bae9dc76b68e4b19" PRIMARY KEY ("id")
);

-- accountType: 'ahorros' | 'corriente'
-- accountNumber: texto con dígitos y guiones (conserva ceros a la izquierda)
-- holderId: cédula (10 dígitos) o RUC (13 dígitos)
CREATE TABLE IF NOT EXISTS "donation_accounts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "bankName" character varying(120) NOT NULL,
  "accountType" character varying(20) NOT NULL,
  "accountNumber" character varying(40) NOT NULL,
  "holderName" character varying(150) NOT NULL,
  "holderId" character varying(13),
  "holderRole" character varying(120),
  "email" character varying(150),
  "notes" text,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_accounts_type" CHECK ("accountType" IN ('ahorros', 'corriente')),
  CONSTRAINT "PK_9a786b3562d048c0e39bfcdbbb0" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_accounts_active_order" ON "donation_accounts" ("active", "displayOrder");

-- icon: nombre de icono lucide de la lista permitida
CREATE TABLE IF NOT EXISTS "donation_purposes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "title" character varying(120) NOT NULL,
  "description" text NOT NULL,
  "icon" character varying(30) NOT NULL DEFAULT 'Heart',
  "imageUrl" text,
  "imagePublicId" text,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_purposes_icon" CHECK ("icon" IN ('Heart', 'HandHeart', 'Users', 'BookOpen', 'Tent', 'Church', 'GraduationCap', 'Gift', 'Sparkles', 'Globe')),
  CONSTRAINT "PK_fe32cb9c09b9a5b2181f680969e" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_purposes_active_order" ON "donation_purposes" ("active", "displayOrder");

-- startsAt / endsAt: fechas solo día; NULL = sin límite
CREATE TABLE IF NOT EXISTS "donation_campaigns" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(120) NOT NULL,
  "title" character varying(150) NOT NULL,
  "description" text NOT NULL,
  "goalAmount" numeric(12,2),
  "raisedAmount" numeric(12,2),
  "currency" character varying(3) NOT NULL DEFAULT 'USD',
  "imageUrl" text,
  "imagePublicId" text,
  "startsAt" date,
  "endsAt" date,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_0ba5a21aa57099936d4f5a0621b" UNIQUE ("slug"),
  CONSTRAINT "chk_donation_campaigns_goal" CHECK ("goalAmount" IS NULL OR "goalAmount" >= 0),
  CONSTRAINT "chk_donation_campaigns_raised" CHECK ("raisedAmount" IS NULL OR "raisedAmount" >= 0),
  CONSTRAINT "chk_donation_campaigns_dates" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" >= "startsAt"),
  CONSTRAINT "PK_d592dfa0964d30ef0095c66b45a" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_campaigns_active_order" ON "donation_campaigns" ("active", "displayOrder");

-- SEMILLA
-- Configuración de donaciones por defecto: textos neutros y SIN datos bancarios
-- (las cuentas, el QR y PayPal los pone el Tesorero/a Nacional desde el admin).
-- ON CONFLICT DO NOTHING: no pisa lo que se haya editado desde el admin.
INSERT INTO "donation_settings" ("id", "headline", "intro", "contactNote", "email")
VALUES (
  1,
  'Apoya la misión de JMV Ecuador',
  'Tu aporte ayuda a que más jóvenes vivan la fe, se formen y sirvan a los más pobres al estilo de María y de San Vicente de Paúl.',
  '¿Tienes dudas sobre tu donación? Escríbenos y te ayudamos.',
  'jmvecuador@gmail.com'
)
ON CONFLICT ("id") DO NOTHING;

-- Estatutos Nacionales vigentes (los mismos de src/statutes/seed/statutes.seed.ts).
-- ON CONFLICT (slug) DO NOTHING: no pisa lo que se haya editado desde el admin.
-- Solo queda vigente si todavía no hay otra versión vigente (índice único parcial).
--
-- INSERT INTO "statute_versions"
--   ("slug", "title", "versionLabel", "approvedAt", "approvedBy", "summary", "content", "pdfUrl", "isCurrent", "published")
-- SELECT
--   'estatutos-nacionales-2010', 'Estatutos Nacionales', '2010', '2010-08-15', 'G. Gregory Gay, C.M., Director General', NULL, '...', NULL,
--   NOT EXISTS (SELECT 1 FROM "statute_versions" WHERE "isCurrent" = true), true
-- ON CONFLICT ("slug") DO NOTHING;

COMMIT;
