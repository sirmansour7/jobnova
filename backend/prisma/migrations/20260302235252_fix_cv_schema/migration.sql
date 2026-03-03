/*
  Warnings:

  - You are about to drop the column `analysisJson` on the `Cv` table. All the data in the column will be lost.
  - You are about to drop the column `analysisProvider` on the `Cv` table. All the data in the column will be lost.
  - You are about to drop the column `analysisUpdatedAt` on the `Cv` table. All the data in the column will be lost.
  - You are about to drop the column `analysisVersion` on the `Cv` table. All the data in the column will be lost.
  - You are about to drop the column `contentJson` on the `Cv` table. All the data in the column will be lost.
  - You are about to drop the column `deadline` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `jobType` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `Job` table. All the data in the column will be lost.
  - Added the required column `data` to the `Cv` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cv" DROP COLUMN "analysisJson",
DROP COLUMN "analysisProvider",
DROP COLUMN "analysisUpdatedAt",
DROP COLUMN "analysisVersion",
DROP COLUMN "contentJson",
ADD COLUMN     "data" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "deadline",
DROP COLUMN "experience",
DROP COLUMN "jobType",
DROP COLUMN "requirements",
DROP COLUMN "salary",
DROP COLUMN "skills";
