-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('DRAFT', 'SENT', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "SavedBuild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "allocations" JSONB NOT NULL,
    "createdByDiscordId" TEXT NOT NULL,
    "createdByUsername" TEXT NOT NULL,
    "status" "BuildStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedBuild_jobId_idx" ON "SavedBuild"("jobId");

-- CreateIndex
CREATE INDEX "SavedBuild_status_idx" ON "SavedBuild"("status");

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
