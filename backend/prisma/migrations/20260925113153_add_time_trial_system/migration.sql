-- CreateEnum
CREATE TYPE "TimeTrialStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "TimeTrial" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "status" "TimeTrialStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeTrial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeTrialEntry" (
    "id" SERIAL NOT NULL,
    "timeTrialId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "userId" INTEGER,
    "timeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeTrialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrial_eventId_key" ON "TimeTrial"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrialEntry_timeTrialId_email_key" ON "TimeTrialEntry"("timeTrialId", "email");

-- AddForeignKey
ALTER TABLE "TimeTrial" ADD CONSTRAINT "TimeTrial_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrialEntry" ADD CONSTRAINT "TimeTrialEntry_timeTrialId_fkey" FOREIGN KEY ("timeTrialId") REFERENCES "TimeTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTrialEntry" ADD CONSTRAINT "TimeTrialEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
