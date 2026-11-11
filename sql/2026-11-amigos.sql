-- Amigos y avisos al celular (fase 2). Idempotente (lo ejecuta jmv-ops.sh deploy).

-- Código para agregarse (6 caracteres, se genera la primera vez que se pide)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "friendCode" varchar(8);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_friend_code" ON "user" ("friendCode") WHERE "friendCode" IS NOT NULL;

-- Amistades: una sola fila por pareja (pendiente, aceptada o bloqueada)
CREATE TABLE IF NOT EXISTS "friendships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "addresseeId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" varchar(10) NOT NULL DEFAULT 'pending',
  "blockedById" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "respondedAt" timestamptz,
  CONSTRAINT "chk_friendship_distinct" CHECK ("requesterId" <> "addresseeId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_friendship_pair"
  ON "friendships" (LEAST("requesterId", "addresseeId"), GREATEST("requesterId", "addresseeId"));
CREATE INDEX IF NOT EXISTS "idx_friendship_requester" ON "friendships" ("requesterId", "status");
CREATE INDEX IF NOT EXISTS "idx_friendship_addressee" ON "friendships" ("addresseeId", "status");

-- Tokens de Expo para avisos al celular (uno por dispositivo)
CREATE TABLE IF NOT EXISTS "push_tokens" (
  "token" varchar(200) PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "platform" varchar(10),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_push_tokens_user" ON "push_tokens" ("userId");
