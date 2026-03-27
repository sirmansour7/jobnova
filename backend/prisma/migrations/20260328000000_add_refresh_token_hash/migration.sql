-- Column was added manually to Neon production DB on 2026-03-28.
-- IF NOT EXISTS ensures this is a no-op if already present.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT;
