-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "currency" TEXT DEFAULT 'EGP',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER;
