-- Fix: InterviewMessage.role column was manually changed to a MessageRole enum in the DB
-- but this enum was never tracked in migrations or the Prisma schema.
-- Convert it back to plain TEXT so the application can write 'bot', 'candidate', etc.

ALTER TABLE "InterviewMessage"
  ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

DROP TYPE IF EXISTS "MessageRole";
