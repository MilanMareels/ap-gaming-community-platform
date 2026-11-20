-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "TeamScheduleBlockType" AS ENUM ('SCRIM', 'PRACTICE', 'MATCH');

-- AlterTable
ALTER TABLE "RosterGame" ADD COLUMN     "scheduleEndHour" INTEGER NOT NULL DEFAULT 23,
ADD COLUMN     "scheduleStartHour" INTEGER NOT NULL DEFAULT 13;

-- CreateTable
CREATE TABLE "PlayerAvailability" (
    "id" SERIAL NOT NULL,
    "rosterEntryId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamScheduleBlock" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "type" "TeamScheduleBlockType" NOT NULL,
    "title" TEXT,
    "date" DATE NOT NULL,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerAvailability_date_idx" ON "PlayerAvailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAvailability_rosterEntryId_date_hour_key" ON "PlayerAvailability"("rosterEntryId", "date", "hour");

-- CreateIndex
CREATE INDEX "TeamScheduleBlock_gameId_date_idx" ON "TeamScheduleBlock"("gameId", "date");

-- AddForeignKey
ALTER TABLE "PlayerAvailability" ADD CONSTRAINT "PlayerAvailability_rosterEntryId_fkey" FOREIGN KEY ("rosterEntryId") REFERENCES "RosterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamScheduleBlock" ADD CONSTRAINT "TeamScheduleBlock_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "RosterGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Permission to manage team schedules (scrims, everyone's availability), granted to the Admin role
INSERT INTO "Permission" ("key", "description") VALUES ('esports.schedule.manage', 'Manage esports team schedules')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'esports.schedule.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
