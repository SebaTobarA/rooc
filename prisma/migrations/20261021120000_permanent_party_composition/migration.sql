-- AlterTable
ALTER TABLE "PartyTemplate" ADD COLUMN     "permanent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PartyTemplate_event_permanent_idx" ON "PartyTemplate"("event", "permanent");
