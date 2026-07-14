-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "setId" TEXT;

-- CreateTable
CREATE TABLE "LeadershipPosition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadershipPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipMember" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "discordAvatarHash" TEXT,
    "nickname" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadershipMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseStatText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSetTier" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "refineLevel" INTEGER NOT NULL,
    "statText" TEXT NOT NULL,

    CONSTRAINT "ItemSetTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSetPieceBonus" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "pieceCount" INTEGER NOT NULL,
    "statText" TEXT NOT NULL,

    CONSTRAINT "ItemSetPieceBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadershipPosition_order_idx" ON "LeadershipPosition"("order");

-- CreateIndex
CREATE INDEX "LeadershipMember_positionId_idx" ON "LeadershipMember"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSet_name_key" ON "ItemSet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSet_slug_key" ON "ItemSet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSetTier_setId_refineLevel_key" ON "ItemSetTier"("setId", "refineLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSetPieceBonus_setId_pieceCount_key" ON "ItemSetPieceBonus"("setId", "pieceCount");

-- CreateIndex
CREATE INDEX "Item_setId_idx" ON "Item"("setId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ItemSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipMember" ADD CONSTRAINT "LeadershipMember_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LeadershipPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSetTier" ADD CONSTRAINT "ItemSetTier_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ItemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSetPieceBonus" ADD CONSTRAINT "ItemSetPieceBonus_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ItemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
