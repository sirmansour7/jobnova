/*
  Warnings:

  - The `type` column on the `Interview` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `hrDecision` column on the `InterviewSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "HrDecision" AS ENUM ('SHORTLISTED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('ONLINE', 'IN_PERSON', 'PHONE');

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "type",
ADD COLUMN     "type" "InterviewType" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "InterviewSession" DROP COLUMN "hrDecision",
ADD COLUMN     "hrDecision" "HrDecision";
