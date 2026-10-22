-- CreateTable
CREATE TABLE "PartyDraft" (
    "event" TEXT NOT NULL,
    "board" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "publishedByName" TEXT,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyDraft_pkey" PRIMARY KEY ("event")
);

-- CreateTable
CREATE TABLE "PartyDraftEditor" (
    "discordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyDraftEditor_pkey" PRIMARY KEY ("discordId")
);

-- CreateIndex
CREATE INDEX "PartyDraftEditor_lastSeenAt_idx" ON "PartyDraftEditor"("lastSeenAt");
