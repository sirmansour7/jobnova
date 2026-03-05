-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "screeningAnswers" JSONB,
ADD COLUMN     "screeningCompletedAt" TIMESTAMP(3);
