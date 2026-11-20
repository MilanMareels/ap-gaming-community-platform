-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "PlanningBlockType" AS ENUM ('SCRIM', 'PRACTICE', 'MATCH');

-- CreateTable
CREATE TABLE "PlanningTeam" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "handle" TEXT,
    "isPlayer" BOOLEAN NOT NULL DEFAULT true,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningDay" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 13,
    "endHour" INTEGER NOT NULL DEFAULT 23,
    "note" TEXT,

    CONSTRAINT "PlanningDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningAvailability" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningBlock" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "type" "PlanningBlockType" NOT NULL,
    "title" TEXT,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PlanningBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningTeamMember_userId_idx" ON "PlanningTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningTeamMember_teamId_userId_key" ON "PlanningTeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningDay_teamId_date_key" ON "PlanningDay"("teamId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningAvailability_dayId_memberId_hour_key" ON "PlanningAvailability"("dayId", "memberId", "hour");

-- AddForeignKey
ALTER TABLE "PlanningTeamMember" ADD CONSTRAINT "PlanningTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PlanningTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTeamMember" ADD CONSTRAINT "PlanningTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningDay" ADD CONSTRAINT "PlanningDay_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "PlanningTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAvailability" ADD CONSTRAINT "PlanningAvailability_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanningDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAvailability" ADD CONSTRAINT "PlanningAvailability_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PlanningTeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBlock" ADD CONSTRAINT "PlanningBlock_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanningDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Permission to manage every planning team (create teams, assign their managers), granted to the Admin role
INSERT INTO "Permission" ("key", "description") VALUES ('esports.schedule.manage', 'Manage all esports team planning')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'esports.schedule.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
