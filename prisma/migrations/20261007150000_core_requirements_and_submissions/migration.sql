-- CreateEnum
CREATE TYPE "CoreSubmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "CoreSheetRevision" ADD COLUMN "reportedByPlayer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CoreRequirementSettings" (
    "id" TEXT NOT NULL,
    "mins" JSONB NOT NULL,
    "updatedByUsername" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreRequirementSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreSheetSubmission" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "power" INTEGER,
    "refine" INTEGER,
    "medals" INTEGER,
    "mr" INTEGER,
    "feathers" INTEGER,
    "enchants" INTEGER,
    "cardsPvp" BOOLEAN,
    "s2Orange" BOOLEAN,
    "skillTreePvp" BOOLEAN,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "CoreSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewedByUsername" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreSheetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoreSheetSubmission_discordId_createdAt_idx" ON "CoreSheetSubmission"("discordId", "createdAt");

-- CreateIndex
CREATE INDEX "CoreSheetSubmission_status_idx" ON "CoreSheetSubmission"("status");
