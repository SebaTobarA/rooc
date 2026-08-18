-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowedRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
