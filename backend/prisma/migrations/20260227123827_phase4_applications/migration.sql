/*
  Warnings:

  - You are about to drop the column `organizationId` on the `ImportBatch` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `cityId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `governorateId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `partnerId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `JobRaw` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `JobRaw` table. All the data in the column will be lost.
  - You are about to drop the column `partnerId` on the `JobRaw` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the `City` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Governorate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partnerName` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleInOrg` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrgRoleInOrg" AS ENUM ('OWNER', 'HR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- DropForeignKey
ALTER TABLE "City" DROP CONSTRAINT "City_governorateId_fkey";

-- DropForeignKey
ALTER TABLE "City" DROP CONSTRAINT "City_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Governorate" DROP CONSTRAINT "Governorate_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ImportBatch" DROP CONSTRAINT "ImportBatch_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_cityId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_governorateId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "JobRaw" DROP CONSTRAINT "JobRaw_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobRaw" DROP CONSTRAINT "JobRaw_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "JobTag" DROP CONSTRAINT "JobTag_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobTag" DROP CONSTRAINT "JobTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Partner" DROP CONSTRAINT "Partner_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_organizationId_fkey";

-- DropIndex
DROP INDEX "ImportBatch_organizationId_idx";

-- DropIndex
DROP INDEX "Job_cityId_idx";

-- DropIndex
DROP INDEX "Job_governorateId_idx";

-- DropIndex
DROP INDEX "Job_organizationId_partnerId_title_key";

-- DropIndex
DROP INDEX "Job_partnerId_idx";

-- DropIndex
DROP INDEX "JobRaw_organizationId_idx";

-- AlterTable
ALTER TABLE "ImportBatch" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "category",
DROP COLUMN "cityId",
DROP COLUMN "governorateId",
DROP COLUMN "partnerId",
DROP COLUMN "updatedAt",
ADD COLUMN     "partnerName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JobRaw" DROP COLUMN "jobId",
DROP COLUMN "organizationId",
DROP COLUMN "partnerId";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "createdAt",
DROP COLUMN "role",
ADD COLUMN     "roleInOrg" "OrgRoleInOrg" NOT NULL;

-- DropTable
DROP TABLE "City";

-- DropTable
DROP TABLE "Governorate";

-- DropTable
DROP TABLE "JobTag";

-- DropTable
DROP TABLE "Partner";

-- DropTable
DROP TABLE "Tag";

-- DropEnum
DROP TYPE "MembershipRole";

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "coverLetter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_roleInOrg_idx" ON "Membership"("roleInOrg");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
