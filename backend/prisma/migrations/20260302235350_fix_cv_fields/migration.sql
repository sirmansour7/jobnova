/*
  Warnings:

  - You are about to drop the column `data` on the `Cv` table. All the data in the column will be lost.
  - Added the required column `contentJson` to the `Cv` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cv" DROP COLUMN "data",
ADD COLUMN     "analysisJson" JSONB,
ADD COLUMN     "analysisProvider" TEXT,
ADD COLUMN     "analysisUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "analysisVersion" INTEGER,
ADD COLUMN     "contentJson" JSONB NOT NULL;
