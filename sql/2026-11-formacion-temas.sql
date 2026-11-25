-- Temas de formación: el hilo que une preguntas, libros y citas ("Quiero profundizar en…"). Idempotente.
CREATE TABLE IF NOT EXISTS "themes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(60) NOT NULL,
  "name" text NOT NULL,
  "axis" varchar(20) NOT NULL,
  "gameCategory" varchar(30),
  "summary" text,
  "quotes" jsonb NOT NULL DEFAULT '[]',
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_themes_slug" ON "themes" ("slug");

-- Libros de la biblioteca: de qué temas tratan, a qué preguntas responden y para quién son
ALTER TABLE "library_documents" ADD COLUMN IF NOT EXISTS "themes" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "library_documents" ADD COLUMN IF NOT EXISTS "answers" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "library_documents" ADD COLUMN IF NOT EXISTS "level" varchar(12);

-- Lista inicial de temas (solo se insertan los que no existan)
INSERT INTO "themes" ("slug", "name", "axis", "gameCategory", "displayOrder") VALUES
  ('conocerme', 'Conocerme y aceptarme', 'humano', NULL, 10),
  ('afectividad-amistad', 'Afectividad y amistad', 'humano', NULL, 20),
  ('familia', 'Familia', 'humano', NULL, 30),
  ('proyecto-de-vida', 'Proyecto de vida y vocación', 'humano', NULL, 40),
  ('liderazgo', 'Liderazgo y trabajo en equipo', 'humano', NULL, 50),
  ('biblia', 'La Biblia', 'cristocentrico', 'biblia', 60),
  ('jesucristo', 'Jesucristo: su vida y mensaje', 'cristocentrico', 'biblia', 70),
  ('oracion', 'La oración', 'cristocentrico', 'iglesia', 80),
  ('sacramentos', 'Los sacramentos', 'cristocentrico', 'iglesia', 90),
  ('eucaristia', 'La Eucaristía', 'cristocentrico', 'iglesia', 100),
  ('reconciliacion', 'La Reconciliación', 'cristocentrico', 'iglesia', 110),
  ('vida-moral', 'Vida moral y virtudes', 'cristocentrico', 'iglesia', 120),
  ('maria-en-la-biblia', 'María en la Biblia', 'mariano', 'maria', 130),
  ('virtudes-de-maria', 'Virtudes de María', 'mariano', 'maria', 140),
  ('dogmas-marianos', 'Dogmas marianos', 'mariano', 'maria', 150),
  ('medalla-milagrosa', 'Apariciones y Medalla Milagrosa', 'mariano', 'maria', 160),
  ('rosario', 'El rosario y la devoción mariana', 'mariano', 'maria', 170),
  ('consagracion-a-maria', 'Consagración a María', 'mariano', 'maria', 180),
  ('san-vicente', 'San Vicente de Paúl', 'vicenciano', 'vicenciana', 190),
  ('santa-luisa', 'Santa Luisa de Marillac', 'vicenciano', 'vicenciana', 200),
  ('santa-catalina', 'Santa Catalina Labouré', 'vicenciano', 'vicenciana', 210),
  ('carisma-servicio', 'Carisma y servicio a los pobres', 'vicenciano', 'vicenciana', 220),
  ('familia-vicenciana', 'Familia Vicenciana', 'vicenciano', 'vicenciana', 230),
  ('historia-jmv', 'Historia e identidad de JMV', 'vicenciano', 'historia_jmv', 240),
  ('mision', 'Misión', 'vicenciano', 'santos_mision', 250),
  ('iglesia', 'La Iglesia', 'eclesial', 'iglesia', 260),
  ('catecismo', 'Catecismo y doctrina', 'eclesial', 'iglesia', 270),
  ('liturgia', 'Liturgia y año litúrgico', 'eclesial', 'iglesia', 280),
  ('doctrina-social', 'Doctrina Social de la Iglesia', 'eclesial', 'iglesia', 290),
  ('papas', 'Papas y magisterio', 'eclesial', 'iglesia', 300),
  ('padres-de-la-iglesia', 'Padres de la Iglesia y primeros cristianos', 'eclesial', 'iglesia', 310),
  ('santos', 'Santos', 'eclesial', 'santos_mision', 320)
ON CONFLICT ("slug") DO NOTHING;
