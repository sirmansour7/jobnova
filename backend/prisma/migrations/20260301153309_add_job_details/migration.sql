/*
  Warnings:

  - The values [ACCOUNT_LOCKED] on the enum `AuditEvent` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditEvent_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT', 'REFRESH', 'REGISTER', 'EMAIL_VERIFIED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS', 'SUSPICIOUS_ACTIVITY');
ALTER TABLE "AuditLog" ALTER COLUMN "event" TYPE "AuditEvent_new" USING ("event"::text::"AuditEvent_new");
ALTER TYPE "AuditEvent" RENAME TO "AuditEvent_old";
ALTER TYPE "AuditEvent_new" RENAME TO "AuditEvent";
DROP TYPE "public"."AuditEvent_old";
COMMIT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
