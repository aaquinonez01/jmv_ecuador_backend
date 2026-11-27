-- Puntos por subir la foto con la medalla (una vez por persona). Idempotente.
ALTER TABLE "fiesta_keepsakes" ADD COLUMN IF NOT EXISTS "points" int NOT NULL DEFAULT 0;

INSERT INTO "points_rules" ("key", "label", "hint", "points", "displayOrder") VALUES
  ('fiesta_recuerdo', 'Fiestas: foto con la medalla', 'Por subir su foto de recuerdo el día de la fiesta. Si la borra, se le restan; si la vuelve a subir, los recupera.', 10, 24)
ON CONFLICT ("key") DO NOTHING;

-- Quienes ya la habían subido antes de que diera puntos también los reciben (una sola vez)
WITH pend AS (
  UPDATE "fiesta_keepsakes" k SET "points" = r."points"
    FROM "points_rules" r, "user" u
   WHERE r."key" = 'fiesta_recuerdo' AND r."points" > 0
     AND u."id" = k."userId" AND u."role" <> 'admin' AND k."points" = 0
  RETURNING k."userId", k."fiestaId", k."points"
), tx AS (
  INSERT INTO "points_transactions" ("userId", "amount", "reason", "description")
  SELECT p."userId", p."points", 'fiesta', f."title" || ' · Foto con la medalla'
    FROM pend p JOIN "fiestas" f ON f."id" = p."fiestaId"
  RETURNING "userId", "amount"
)
UPDATE "user" u SET "pointsBalance" = u."pointsBalance" + t."amount" FROM tx t WHERE u."id" = t."userId";
