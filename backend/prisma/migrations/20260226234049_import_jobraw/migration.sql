-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRaw" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourcePage" INTEGER,
    "rawText" TEXT NOT NULL,
    "confidence" INTEGER,
    "companyName" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "governorate" TEXT,
    "city" TEXT,
    "category" TEXT,
    "tagsCsv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRaw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRaw_batchId_idx" ON "JobRaw"("batchId");

-- CreateIndex
CREATE INDEX "JobRaw_phone_idx" ON "JobRaw"("phone");

-- CreateIndex
CREATE INDEX "JobRaw_companyName_idx" ON "JobRaw"("companyName");

-- AddForeignKey
ALTER TABLE "JobRaw" ADD CONSTRAINT "JobRaw_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
