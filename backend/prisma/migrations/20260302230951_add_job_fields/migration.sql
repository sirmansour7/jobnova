/*
  Warnings:

  - You are about to drop the `Cv` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cv" DROP CONSTRAINT "Cv_userId_fkey";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "requirements" TEXT[],
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "skills" TEXT[];

-- DropTable
DROP TABLE "Cv";
