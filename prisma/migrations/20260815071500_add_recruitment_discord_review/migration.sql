-- CreateEnum
CREATE TYPE "GuildBranch" AS ENUM ('SD1', 'SD2');

-- AlterEnum
-- El valor nuevo no se usa dentro de esta misma migración, así que no hace
-- falta separarlo en dos pasos (PostgreSQL 12+ lo permite en transacción).
ALTER TYPE "ApplicationStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "GuildApplication" ADD COLUMN     "branch" "GuildBranch",
ADD COLUMN     "discordMessageId" TEXT NOT NULL DEFAULT '';
