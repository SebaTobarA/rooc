-- CreateEnum
CREATE TYPE "CardSlot" AS ENUM ('MAIN_HAND', 'OFF_HAND', 'ARMOR', 'CLOAK', 'SHOES', 'ACCESSORY', 'PENDIENTE', 'HEADWEAR', 'FACEWEAR', 'MOUTHWEAR', 'BACKWEAR', 'COSTUME');

-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('VERDE', 'AZUL', 'MORADA');

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "CardSlot" NOT NULL,
    "rarity" "CardRarity" NOT NULL DEFAULT 'VERDE',
    "classRestriction" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "ability" TEXT NOT NULL DEFAULT '',
    "stats" TEXT NOT NULL DEFAULT '',
    "collectionBonus" TEXT NOT NULL DEFAULT '',
    "awaken" TEXT NOT NULL DEFAULT '',
    "refine" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_slug_key" ON "Card"("slug");

-- CreateIndex
CREATE INDEX "Card_slot_idx" ON "Card"("slot");

-- CreateIndex
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");
