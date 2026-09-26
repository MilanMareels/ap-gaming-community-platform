-- CreateEnum
CREATE TYPE "PointTrialStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'TOURNAMENT_POINTS';

-- CreateTable
CREATE TABLE "PointTrial" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "status" "PointTrialStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointTrial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTrialParticipant" (
    "id" SERIAL NOT NULL,
    "pointTrialId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "userId" INTEGER,
    "bestPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTrialParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTrialEntry" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTrialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointTrial_eventId_key" ON "PointTrial"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTrialParticipant_pointTrialId_userId_key" ON "PointTrialParticipant"("pointTrialId", "userId");

-- AddForeignKey
ALTER TABLE "PointTrial" ADD CONSTRAINT "PointTrial_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTrialParticipant" ADD CONSTRAINT "PointTrialParticipant_pointTrialId_fkey" FOREIGN KEY ("pointTrialId") REFERENCES "PointTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTrialParticipant" ADD CONSTRAINT "PointTrialParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTrialEntry" ADD CONSTRAINT "PointTrialEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "PointTrialParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
