-- AlterTable
ALTER TABLE "PartyTemplate" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "communicatedAt" TIMESTAMP(3);
