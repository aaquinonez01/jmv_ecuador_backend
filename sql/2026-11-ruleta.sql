-- Juego de ruleta "Gira y Aprende" (fase 3). Idempotente (lo ejecuta jmv-ops.sh deploy).
-- Las preguntas de ejemplo son las del "Reto del día" de la app, tomadas de
-- jmvecuador.org/quienes-somos/historia. Se insertan una sola vez.

-- Estrellas: moneda del juego (no se canjea; se gana jugando)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "starsBalance" int NOT NULL DEFAULT 0;

-- Banco de preguntas
CREATE TABLE IF NOT EXISTS "game_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" varchar(20) NOT NULL,
  "levels" jsonb NOT NULL DEFAULT '["infancia","prejuvenil","juvenil"]',
  "difficulty" int NOT NULL DEFAULT 2,
  "prompt" text NOT NULL,
  "options" jsonb NOT NULL,
  "correctIndex" int NOT NULL,
  "explanation" text,
  "source" text,
  "status" varchar(10) NOT NULL DEFAULT 'approved',
  "proposedById" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "deleted" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_game_questions_pick" ON "game_questions" ("category", "status") WHERE "deleted" = false;
CREATE INDEX IF NOT EXISTS "idx_game_questions_sync" ON "game_questions" ("updatedAt");

-- Partidas por turnos (A empieza; en "al azar" B se asigna después)
CREATE TABLE IF NOT EXISTS "game_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerAId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "playerBId" uuid REFERENCES "user"("id") ON DELETE CASCADE,
  "mode" varchar(10) NOT NULL,
  "status" varchar(10) NOT NULL DEFAULT 'active',
  "turnUserId" uuid,
  "round" int NOT NULL DEFAULT 1,
  "crownsA" jsonb NOT NULL DEFAULT '[]',
  "crownsB" jsonb NOT NULL DEFAULT '[]',
  "meterA" int NOT NULL DEFAULT 0,
  "meterB" int NOT NULL DEFAULT 0,
  "correctA" int NOT NULL DEFAULT 0,
  "correctB" int NOT NULL DEFAULT 0,
  "crownPendingFor" uuid,
  "winnerId" uuid,
  "endReason" varchar(10),
  "lastMoveAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "finishedAt" timestamptz
);
CREATE INDEX IF NOT EXISTS "idx_game_matches_a" ON "game_matches" ("playerAId", "status");
CREATE INDEX IF NOT EXISTS "idx_game_matches_b" ON "game_matches" ("playerBId", "status");
CREATE INDEX IF NOT EXISTS "idx_game_matches_waiting" ON "game_matches" ("createdAt") WHERE "status" = 'waiting';

-- Cada pregunta entregada en una partida (el servidor valida la respuesta y el tiempo)
CREATE TABLE IF NOT EXISTS "game_turns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "matchId" uuid NOT NULL REFERENCES "game_matches"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "questionId" uuid NOT NULL REFERENCES "game_questions"("id") ON DELETE CASCADE,
  "category" varchar(20) NOT NULL,
  "isCrown" boolean NOT NULL DEFAULT false,
  "issuedAt" timestamptz NOT NULL DEFAULT now(),
  "answeredAt" timestamptz,
  "chosenIndex" int,
  "correct" boolean
);
CREATE INDEX IF NOT EXISTS "idx_game_turns_match" ON "game_turns" ("matchId", "issuedAt");

-- Estrellas ganadas por día (para el tope diario)
CREATE TABLE IF NOT EXISTS "game_star_days" (
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "day" date NOT NULL,
  "stars" int NOT NULL DEFAULT 0,
  PRIMARY KEY ("userId", "day")
);

-- Reglas de puntos del juego (configurables en el admin)
INSERT INTO "points_rules" ("key", "label", "hint", "points", "displayOrder") VALUES
  ('ruleta_victoria', 'Ganar una partida de Gira y Aprende', 'Al terminar la partida.', 20, 10),
  ('ruleta_partida', 'Terminar una partida de Gira y Aprende', 'Para quien pierde o empata (si no se rindió ni la dejó vencer).', 5, 11),
  ('ruleta_tope_diario', 'Tope diario por Gira y Aprende', 'Lo máximo que una persona puede ganar al día con el juego.', 60, 12),
  ('estrellas_tope_diario', 'Tope diario de estrellas', 'Estrellas del juego (no se canjean) que se pueden ganar al día.', 100, 13)
ON CONFLICT ("key") DO NOTHING;

-- Preguntas iniciales (del Reto del día; fuente: historia publicada de JMV)
INSERT INTO "game_questions" ("id", "category", "prompt", "options", "correctIndex", "explanation", "source") VALUES
  ('f0a1c004-0000-4000-8000-000000000001', 'maria', '¿A quién se apareció la Virgen en la rue du Bac en 1830?',
   '["Santa Luisa de Marillac","Santa Catalina Labouré","Santa Bernardita"]', 1,
   'El 18 de julio de 1830 la Virgen le reveló su deseo de formar una asociación de jóvenes.', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000002', 'historia_jmv', '¿Cuál es el lema de JMV?',
   '["Contemplar, vivir y servir","Orar y trabajar","Todo por amor"]', 0,
   'Tres verbos que resumen nuestro camino: encuentro con Dios, vida cristiana y servicio al pobre.', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000003', 'historia_jmv', '¿En qué año se fundó JMV en Ecuador?',
   '["1987","2000","1995"]', 2,
   'El 18 de julio de 1995. El primer grupo fue el de la "Medalla Milagrosa" de Quito.', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000004', 'historia_jmv', '¿Qué papa aprobó oficialmente la asociación en 1847?',
   '["Pío IX","León XIII","Pío X"]', 0,
   'El 20 de junio de 1847, Pío IX aprobó la Asociación de Hijas de María.', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000005', 'historia_jmv', '¿Cómo se llamaban las primeras reuniones de la asociación?',
   '["Retiros Vicencianos","Cenáculos Marianos","Escuelas de María"]', 1,
   'La asociación nació como "Hijas de María Inmaculada", con el P. Aladel como primer director.', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000006', 'historia_jmv', '¿En qué año la asociación recibió el nombre de JMV?',
   '["1987","1850","1999"]', 0,
   'El 28 de abril de 1987 se reconoció como "Asociación Juventud Mariana Vicentina".', 'jmvecuador.org · Historia'),
  ('f0a1c004-0000-4000-8000-000000000007', 'historia_jmv', '¿Qué rama se sumó a la asociación en 1850?',
   '["Los asesores laicos","Los jóvenes varones","Los niños"]', 1,
   'Pasó a llamarse "Hijos e Hijas de María Inmaculada".', 'jmvecuador.org · Historia')
ON CONFLICT ("id") DO NOTHING;
