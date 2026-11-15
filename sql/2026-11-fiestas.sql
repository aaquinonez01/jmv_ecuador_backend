-- Fiestas del Año Vicenciano en la web (novena / triduo / día) con preguntas,
-- propósito, mural de fotos por comunidad y responsables de comunidad.
-- Idempotente (lo ejecuta jmv-ops.sh deploy). La fiesta y sus días se crean una
-- sola vez vacíos: el contenido (tema, oración, preguntas) se carga desde el admin.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isCommunityLead" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "fiestas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(60) NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "feastDate" date NOT NULL,
  "intro" text,
  "published" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_fiestas_slug" ON "fiestas" ("slug");

CREATE TABLE IF NOT EXISTS "fiesta_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiestaId" uuid NOT NULL REFERENCES "fiestas"("id") ON DELETE CASCADE,
  "dayNumber" int NOT NULL,
  "date" date NOT NULL,
  "label" varchar(40) NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "piece" varchar(30) NOT NULL,
  "theme" text,
  "prayer" text,
  "purpose" text,
  "source" text,
  "questions" jsonb NOT NULL DEFAULT '[]',
  "published" boolean NOT NULL DEFAULT false,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_fiesta_days_number" ON "fiesta_days" ("fiestaId", "dayNumber");

CREATE TABLE IF NOT EXISTS "fiesta_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dayId" uuid NOT NULL REFERENCES "fiesta_days"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "answers" jsonb,
  "correct" int NOT NULL DEFAULT 0,
  "total" int NOT NULL DEFAULT 0,
  "onTime" boolean NOT NULL DEFAULT false,
  "answeredAt" timestamptz,
  "purposeDone" boolean NOT NULL DEFAULT false,
  "purposeAt" timestamptz,
  "points" int NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_fiesta_entries_user_day" ON "fiesta_entries" ("dayId", "userId");
CREATE INDEX IF NOT EXISTS "idx_fiesta_entries_user" ON "fiesta_entries" ("userId");

CREATE TABLE IF NOT EXISTS "fiesta_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dayId" uuid NOT NULL REFERENCES "fiesta_days"("id") ON DELETE CASCADE,
  "comunidadId" uuid NOT NULL REFERENCES "comunidades"("id") ON DELETE CASCADE,
  "userId" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "url" text NOT NULL,
  "publicId" text,
  "caption" text,
  "status" varchar(10) NOT NULL DEFAULT 'pending',
  "reviewedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_fiesta_photos_day" ON "fiesta_photos" ("dayId", "status");
CREATE INDEX IF NOT EXISTS "idx_fiesta_photos_comunidad" ON "fiesta_photos" ("comunidadId");

CREATE TABLE IF NOT EXISTS "fiesta_photo_reactions" (
  "photoId" uuid NOT NULL REFERENCES "fiesta_photos"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "emoji" varchar(8) NOT NULL,
  PRIMARY KEY ("photoId", "userId", "emoji")
);

CREATE TABLE IF NOT EXISTS "fiesta_community_modes" (
  "fiestaId" uuid NOT NULL REFERENCES "fiestas"("id") ON DELETE CASCADE,
  "comunidadId" uuid NOT NULL REFERENCES "comunidades"("id") ON DELETE CASCADE,
  "mode" varchar(10) NOT NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("fiestaId", "comunidadId")
);

INSERT INTO "points_rules" ("key", "label", "hint", "points", "displayOrder") VALUES
  ('fiesta_pregunta', 'Fiestas: respuesta correcta', 'Por cada pregunta bien respondida en un día de novena, triduo o fiesta.', 10, 20),
  ('fiesta_a_tiempo', 'Fiestas: responder el mismo día', 'Bono por contestar el día que corresponde (no después).', 5, 21),
  ('fiesta_proposito', 'Fiestas: cumplir el propósito del día', 'Cuando la persona marca que cumplió el propósito.', 5, 22),
  ('fiesta_mural', 'Fiestas: día con fotos en el mural', 'Bono para la comunidad (en su ranking) por cada día con fotos aprobadas.', 20, 23)
ON CONFLICT ("key") DO NOTHING;

-- Novena a la Medalla Milagrosa 2026: 9 días (18 al 26) + la fiesta (27 de noviembre)
INSERT INTO "fiestas" ("id", "slug", "title", "subtitle", "feastDate", "published") VALUES
  ('f0a1c005-0000-4000-8000-000000000001', 'medalla-milagrosa', 'Novena a la Medalla Milagrosa',
   'Fiesta de la Virgen de la Medalla Milagrosa · 27 de noviembre', '2026-11-27', true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fiesta_days" ("id", "fiestaId", "dayNumber", "date", "label", "piece") VALUES
  ('f0a1c005-0000-4000-8000-000000000101', 'f0a1c005-0000-4000-8000-000000000001', 1, '2026-11-18', 'Día 1', 'maria'),
  ('f0a1c005-0000-4000-8000-000000000102', 'f0a1c005-0000-4000-8000-000000000001', 2, '2026-11-19', 'Día 2', 'globo'),
  ('f0a1c005-0000-4000-8000-000000000103', 'f0a1c005-0000-4000-8000-000000000001', 3, '2026-11-20', 'Día 3', 'rayos'),
  ('f0a1c005-0000-4000-8000-000000000104', 'f0a1c005-0000-4000-8000-000000000001', 4, '2026-11-21', 'Día 4', 'inscripcion'),
  ('f0a1c005-0000-4000-8000-000000000105', 'f0a1c005-0000-4000-8000-000000000001', 5, '2026-11-22', 'Día 5', 'estrellas'),
  ('f0a1c005-0000-4000-8000-000000000106', 'f0a1c005-0000-4000-8000-000000000001', 6, '2026-11-23', 'Día 6', 'm'),
  ('f0a1c005-0000-4000-8000-000000000107', 'f0a1c005-0000-4000-8000-000000000001', 7, '2026-11-24', 'Día 7', 'cruz'),
  ('f0a1c005-0000-4000-8000-000000000108', 'f0a1c005-0000-4000-8000-000000000001', 8, '2026-11-25', 'Día 8', 'corazon_jesus'),
  ('f0a1c005-0000-4000-8000-000000000109', 'f0a1c005-0000-4000-8000-000000000001', 9, '2026-11-26', 'Día 9', 'corazon_maria'),
  ('f0a1c005-0000-4000-8000-000000000110', 'f0a1c005-0000-4000-8000-000000000001', 10, '2026-11-27', 'Fiesta', 'medalla')
ON CONFLICT ("id") DO NOTHING;
