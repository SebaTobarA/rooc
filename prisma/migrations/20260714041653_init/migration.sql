-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('WEAPON', 'SHIELD', 'HEAD_TOP', 'HEAD_MID', 'HEAD_LOW', 'ARMOR', 'GARMENT', 'SHOES', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('NONE', 'SWORD', 'DAGGER', 'TWO_HAND_SWORD', 'SPEAR', 'AXE', 'HATCHET', 'MACE', 'ROD', 'STAFF', 'BOW', 'CROSSBOW', 'KNUCKLE', 'INSTRUMENT', 'WHIP', 'BOOK', 'KATAR', 'CASE', 'GRASS', 'SCYTHE');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO');

-- CreateEnum
CREATE TYPE "Element" AS ENUM ('NEUTRO', 'AGUA', 'TIERRA', 'FUEGO', 'VIENTO', 'VENENO', 'SAGRADO', 'SOMBRA', 'FANTASMA', 'NO_MUERTO');

-- CreateEnum
CREATE TYPE "MonsterRace" AS ENUM ('HUMANOIDE', 'BESTIA', 'PLANTA', 'NO_MUERTO', 'DEMONIO', 'INSECTO', 'PEZ', 'ANGEL', 'DRAGON', 'AMORFO');

-- CreateEnum
CREATE TYPE "MonsterSize" AS ENUM ('PEQUENO', 'MEDIANO', 'GRANDE');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'equipo',
    "slot" "EquipSlot" NOT NULL,
    "weaponType" "WeaponType" NOT NULL DEFAULT 'NONE',
    "levelReq" INTEGER NOT NULL DEFAULT 1,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMUN',
    "description" TEXT NOT NULL DEFAULT '',
    "stats" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "atkMax" INTEGER,
    "def" INTEGER NOT NULL DEFAULT 0,
    "element" "Element" NOT NULL DEFAULT 'NEUTRO',
    "elementLevel" INTEGER NOT NULL DEFAULT 1,
    "race" "MonsterRace" NOT NULL,
    "size" "MonsterSize" NOT NULL DEFAULT 'MEDIANO',
    "description" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapMonster" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,

    CONSTRAINT "MapMonster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "mapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_slot_idx" ON "Item"("slot");

-- CreateIndex
CREATE INDEX "Item_rarity_idx" ON "Item"("rarity");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_slug_key" ON "Monster"("slug");

-- CreateIndex
CREATE INDEX "Monster_level_idx" ON "Monster"("level");

-- CreateIndex
CREATE INDEX "Monster_race_idx" ON "Monster"("race");

-- CreateIndex
CREATE UNIQUE INDEX "GameMap_slug_key" ON "GameMap"("slug");

-- CreateIndex
CREATE INDEX "GameMap_region_idx" ON "GameMap"("region");

-- CreateIndex
CREATE INDEX "MapMonster_monsterId_idx" ON "MapMonster"("monsterId");

-- CreateIndex
CREATE UNIQUE INDEX "MapMonster_mapId_monsterId_key" ON "MapMonster"("mapId", "monsterId");

-- CreateIndex
CREATE INDEX "Npc_mapId_idx" ON "Npc"("mapId");

-- CreateIndex
CREATE INDEX "Drop_itemId_idx" ON "Drop"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Drop_monsterId_itemId_key" ON "Drop"("monsterId", "itemId");

-- AddForeignKey
ALTER TABLE "MapMonster" ADD CONSTRAINT "MapMonster_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapMonster" ADD CONSTRAINT "MapMonster_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drop" ADD CONSTRAINT "Drop_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drop" ADD CONSTRAINT "Drop_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
