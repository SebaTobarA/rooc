-- CreateTable
CREATE TABLE "PartyJobColors" (
    "id" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyJobColors_pkey" PRIMARY KEY ("id")
);
