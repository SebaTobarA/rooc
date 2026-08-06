-- CreateEnum
CREATE TYPE "EventAttendanceMode" AS ENUM ('CONFIRM', 'DECLINE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "attendanceMode" "EventAttendanceMode" NOT NULL DEFAULT 'CONFIRM';

-- AlterTable
ALTER TABLE "EventTemplate" ADD COLUMN     "attendanceMode" "EventAttendanceMode" NOT NULL DEFAULT 'CONFIRM';
