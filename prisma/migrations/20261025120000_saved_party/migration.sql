-- CreateTable
CREATE TABLE "SavedParty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "createdByName" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedParty_pkey" PRIMARY KEY ("id")
);
