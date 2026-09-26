-- DropTable
DROP TABLE IF EXISTS "TimeTrialEntry";

-- AlterEnum (remove DRAFT from TimeTrialStatus)
ALTER TYPE "TimeTrialStatus" RENAME TO "TimeTrialStatus_old";
CREATE TYPE "TimeTrialStatus" AS ENUM ('ACTIVE', 'COMPLETED');
ALTER TABLE "TimeTrial" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TimeTrial" ALTER COLUMN "status" TYPE "TimeTrialStatus" USING ("status"::text::"TimeTrialStatus");
ALTER TABLE "TimeTrial" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "TimeTrialStatus_old";

-- CreateTable
CREATE TABLE "TimeTrialParticipant" (
    "id" SERIAL NOT NULL,
    "timeTrialId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "userId" INTEGER,
    "bestTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeTrialParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeTrialRun" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeTrialRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrialParticipant_timeTrialId_userId_key" ON "TimeTrialParticipant"("timeTrialId", "userId");

-- AddForeignKey
ALTER TABLE "TimeTrialParticipant" ADD CONSTRAINT "TimeTrialParticipant_timeTrialId_fkey" FOREIGN KEY ("timeTrialId") REFERENCES "TimeTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrialParticipant" ADD CONSTRAINT "TimeTrialParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrialRun" ADD CONSTRAINT "TimeTrialRun_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TimeTrialParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
