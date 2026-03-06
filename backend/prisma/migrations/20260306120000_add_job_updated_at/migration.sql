-- Add Job.updatedAt (was dropped in phase4_applications and never re-added; schema expects it).
-- Use DEFAULT so existing rows are backfilled safely.
ALTER TABLE "Job" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
