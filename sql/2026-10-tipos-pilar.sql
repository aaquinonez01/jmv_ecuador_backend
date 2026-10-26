-- Tipos de actividad por pilar: un pilar tiene muchos tipos.
-- Idempotente: se puede ejecutar varias veces (lo hace jmv-ops.sh deploy en cada despliegue).

ALTER TABLE "activity_types_catalog" ADD COLUMN IF NOT EXISTS "pillarId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_types_catalog_pillar'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'activity_types_catalog'::regclass
      AND c.contype = 'f'
      AND a.attname = 'pillarId'
  ) THEN
    ALTER TABLE "activity_types_catalog"
      ADD CONSTRAINT "fk_activity_types_catalog_pillar"
      FOREIGN KEY ("pillarId") REFERENCES "activity_pillars"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_activity_types_catalog_pillar" ON "activity_types_catalog" ("pillarId");

-- Pilar inicial de los tipos que ya existían (solo si aún no tienen uno; se puede cambiar en el admin)
UPDATE "activity_types_catalog" t SET "pillarId" = p."id"
FROM "activity_pillars" p
WHERE t."pillarId" IS NULL AND (
  (t."slug" IN ('encuentro-nacional', 'campamento-nacional') AND p."slug" = 'comunidad-juvenil') OR
  (t."slug" = 'retiro-nacional' AND p."slug" = 'espiritualidad') OR
  (t."slug" = 'misiones' AND p."slug" = 'apostolado')
);
