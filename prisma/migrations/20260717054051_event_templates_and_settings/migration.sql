/*
  Warnings:

  - Added the required column `endsAt` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signupsCloseAt` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "signupsCloseAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "templateId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "embedColor" TEXT NOT NULL DEFAULT '#6fe0f5',
    "category" "EventCategory" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildEventSettings" (
    "id" TEXT NOT NULL,
    "defaultChannelId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildEventSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
