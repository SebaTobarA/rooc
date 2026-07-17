-- AlterTable
ALTER TABLE "PartyTemplate" ADD COLUMN     "eventId" TEXT;

-- AddForeignKey
ALTER TABLE "PartyTemplate" ADD CONSTRAINT "PartyTemplate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
