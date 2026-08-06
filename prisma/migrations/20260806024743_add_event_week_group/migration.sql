-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "weekGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Event_weekGroupId_idx" ON "Event"("weekGroupId");
