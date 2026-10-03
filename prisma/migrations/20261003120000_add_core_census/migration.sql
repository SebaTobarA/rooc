-- AlterTable
ALTER TABLE "Event" ADD COLUMN "coreCensusAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CoreCharacterSheet" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL DEFAULT '',
    "refine" INTEGER,
    "medals" INTEGER,
    "mr" INTEGER,
    "feathers" INTEGER,
    "enchants" INTEGER,
    "cardsPvp" BOOLEAN,
    "s2Orange" BOOLEAN,
    "skillTreePvp" BOOLEAN,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedByUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreCharacterSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreEventRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "inGame" BOOLEAN NOT NULL DEFAULT false,
    "inDiscord" BOOLEAN NOT NULL DEFAULT false,
    "voiceSeenAt" TIMESTAMP(3),
    "points" INTEGER,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoreCharacterSheet_discordId_key" ON "CoreCharacterSheet"("discordId");

-- CreateIndex
CREATE INDEX "CoreEventRecord_discordId_idx" ON "CoreEventRecord"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "CoreEventRecord_eventId_discordId_key" ON "CoreEventRecord"("eventId", "discordId");

-- AddForeignKey
ALTER TABLE "CoreEventRecord" ADD CONSTRAINT "CoreEventRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
