-- CreateEnum
CREATE TYPE "JobTier" AS ENUM ('FIRST', 'SECOND', 'TRANSCENDENT');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "JobTier" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "iconUrl" TEXT,
    "portraitUrl" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "maxLevel" INTEGER NOT NULL DEFAULT 10,
    "levelDescriptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "col" INTEGER NOT NULL DEFAULT 0,
    "row" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPrerequisite" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "requiresSkillId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SkillPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_parentId_idx" ON "Job"("parentId");

-- CreateIndex
CREATE INDEX "Job_tier_idx" ON "Job"("tier");

-- CreateIndex
CREATE INDEX "Skill_jobId_idx" ON "Skill"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillPrerequisite_skillId_requiresSkillId_key" ON "SkillPrerequisite"("skillId", "requiresSkillId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_requiresSkillId_fkey" FOREIGN KEY ("requiresSkillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
