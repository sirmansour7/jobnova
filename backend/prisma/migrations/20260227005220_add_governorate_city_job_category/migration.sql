/*
  Warnings:

  - You are about to drop the column `city` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `governorate` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "city",
DROP COLUMN "governorate",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "governorateId" TEXT;

-- CreateTable
CREATE TABLE "Governorate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Governorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "governorateId" TEXT,
    "nameAr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Governorate_organizationId_idx" ON "Governorate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Governorate_organizationId_nameAr_key" ON "Governorate"("organizationId", "nameAr");

-- CreateIndex
CREATE INDEX "City_organizationId_idx" ON "City"("organizationId");

-- CreateIndex
CREATE INDEX "City_governorateId_idx" ON "City"("governorateId");

-- CreateIndex
CREATE UNIQUE INDEX "City_organizationId_nameAr_key" ON "City"("organizationId", "nameAr");

-- CreateIndex
CREATE INDEX "Job_governorateId_idx" ON "Job"("governorateId");

-- CreateIndex
CREATE INDEX "Job_cityId_idx" ON "Job"("cityId");

-- AddForeignKey
ALTER TABLE "Governorate" ADD CONSTRAINT "Governorate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "Governorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "Governorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
