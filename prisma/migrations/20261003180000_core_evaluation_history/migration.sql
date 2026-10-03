-- AlterTable
ALTER TABLE "CoreCharacterSheet" ADD COLUMN "username" TEXT NOT NULL DEFAULT '',
ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "avatarHash" TEXT,
ADD COLUMN "jobName" TEXT,
ADD COLUMN "inCore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CoreEventRecord" ADD COLUMN "surveyStatus" "EventSignupStatus";

-- CreateTable
CREATE TABLE "CoreSheetRevision" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "refine" INTEGER,
    "medals" INTEGER,
    "mr" INTEGER,
    "feathers" INTEGER,
    "enchants" INTEGER,
    "cardsPvp" BOOLEAN,
    "s2Orange" BOOLEAN,
    "skillTreePvp" BOOLEAN,
    "notes" TEXT NOT NULL DEFAULT '',
    "reviewedByUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoreSheetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreMembershipPeriod" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CoreMembershipPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoreSheetRevision_discordId_createdAt_idx" ON "CoreSheetRevision"("discordId", "createdAt");

-- CreateIndex
CREATE INDEX "CoreMembershipPeriod_discordId_idx" ON "CoreMembershipPeriod"("discordId");
