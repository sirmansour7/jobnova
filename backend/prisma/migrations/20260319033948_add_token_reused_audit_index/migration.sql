-- AlterEnum
ALTER TYPE "AuditEvent" ADD VALUE 'TOKEN_REUSED';

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
