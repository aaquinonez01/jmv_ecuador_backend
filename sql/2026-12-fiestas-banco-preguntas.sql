-- Banco de preguntas por día: se sortean "quizSize" preguntas en cada visita. Idempotente.
ALTER TABLE "fiesta_days" ADD COLUMN IF NOT EXISTS "quizSize" int;
ALTER TABLE "fiesta_entries" ADD COLUMN IF NOT EXISTS "questionIds" jsonb;

-- Quien ya respondió queda ligado a las preguntas que tenía su día en ese momento,
-- para que su repaso no cambie si después se agregan o retiran preguntas.
UPDATE "fiesta_entries" e
   SET "questionIds" = (SELECT jsonb_agg(q->>'id') FROM jsonb_array_elements(d."questions") q)
  FROM "fiesta_days" d
 WHERE d."id" = e."dayId"
   AND e."answers" IS NOT NULL
   AND e."questionIds" IS NULL
   AND jsonb_array_length(d."questions") = jsonb_array_length(e."answers");
