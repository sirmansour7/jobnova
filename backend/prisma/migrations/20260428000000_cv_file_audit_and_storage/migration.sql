-- New audit event for authorized CV file downloads
ALTER TYPE "AuditEvent" ADD VALUE 'CV_FILE_ACCESSED';

-- Store relative keys only: cv/<filename> (not full public URLs)
UPDATE "Application"
SET "cvUrl" = regexp_replace("cvUrl", '^.*/uploads/cv/', 'cv/')
WHERE "cvUrl" IS NOT NULL
  AND "cvUrl" LIKE '%/uploads/cv/%';

UPDATE "Application"
SET "cvUrl" = 'cv/' || "cvUrl"
WHERE "cvUrl" IS NOT NULL
  AND "cvUrl" NOT LIKE 'http%'
  AND "cvUrl" NOT LIKE 'cv/%';
