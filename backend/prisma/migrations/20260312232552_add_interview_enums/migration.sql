/*
  Warnings:

  - The `status` column on the `Interview` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `InterviewSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('active', 'completed');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "status",
ADD COLUMN     "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "InterviewSession" DROP COLUMN "status",
ADD COLUMN     "status" "InterviewSessionStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- CreateIndex
CREATE INDEX "InterviewSession_status_idx" ON "InterviewSession"("status");
