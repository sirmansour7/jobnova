-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "requirements" TEXT[],
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "skills" TEXT[];
