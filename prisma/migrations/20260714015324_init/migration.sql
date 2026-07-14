-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'equipo',
    "slot" TEXT NOT NULL,
    "weaponType" TEXT NOT NULL DEFAULT 'NONE',
    "levelReq" INTEGER NOT NULL DEFAULT 1,
    "rarity" TEXT NOT NULL DEFAULT 'COMUN',
    "description" TEXT NOT NULL DEFAULT '',
    "stats" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "atkMax" INTEGER,
    "def" INTEGER NOT NULL DEFAULT 0,
    "element" TEXT NOT NULL DEFAULT 'NEUTRO',
    "elementLevel" INTEGER NOT NULL DEFAULT 1,
    "race" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'MEDIANO',
    "description" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MapMonster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapId" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    CONSTRAINT "MapMonster_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapMonster_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "mapId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Npc_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "GameMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monsterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Drop_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Drop_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
