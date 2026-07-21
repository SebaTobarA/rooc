-- CreateTable
CREATE TABLE "CoreGuildBoard" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "updatedByDiscordId" TEXT,
    "updatedByUsername" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoreGuildBoard_pkey" PRIMARY KEY ("id")
);
