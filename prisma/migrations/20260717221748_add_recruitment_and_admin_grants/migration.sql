-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'WAITLISTED');

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "canManageRecruitment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isApplicantRole" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GuildApplication" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "discordAvatarHash" TEXT,
    "characterName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "levelText" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL,
    "aboutYou" TEXT NOT NULL DEFAULT '',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewedByDiscordId" TEXT,
    "reviewedByUsername" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminGrant" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarHash" TEXT,
    "grantedByDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildApplication_discordId_key" ON "GuildApplication"("discordId");

-- CreateIndex
CREATE INDEX "GuildApplication_status_idx" ON "GuildApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminGrant_discordId_key" ON "AdminGrant"("discordId");
