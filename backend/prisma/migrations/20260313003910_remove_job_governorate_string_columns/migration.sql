/*
  Warnings:

  - You are about to drop the column `city` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `governorate` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "city",
DROP COLUMN "governorate";
