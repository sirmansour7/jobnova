/*
  Warnings:

  - Added the required column `updatedAt` to the `ImportBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `JobRaw` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "JobRaw" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Job_title_idx" ON "Job"("title");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx" ON "Job"("expiresAt");
