-- Fiestas: símbolo por capas (una imagen base y una capa por día) para armar fiestas desde el admin. Idempotente.
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "symbolKind" varchar(10) NOT NULL DEFAULT 'medal';
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "symbolName" text;
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "symbolImage" text;
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "pieceWord" text;
ALTER TABLE "fiestas" ADD COLUMN IF NOT EXISTS "piecesWord" text;
ALTER TABLE "fiesta_days" ADD COLUMN IF NOT EXISTS "pieceName" text;
ALTER TABLE "fiesta_days" ADD COLUMN IF NOT EXISTS "layerImage" text;
