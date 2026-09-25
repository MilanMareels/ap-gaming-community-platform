-- CreateEnum
CREATE TYPE "BracketFormat" AS ENUM ('SINGLE_ELIMINATION');

-- CreateEnum
CREATE TYPE "BracketStatus" AS ENUM ('DRAFT', 'GENERATED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'BYE', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "Bracket" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "format" "BracketFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "playersPerMatch" INTEGER NOT NULL DEFAULT 2,
    "advancingPerMatch" INTEGER NOT NULL DEFAULT 1,
    "thirdPlaceMatch" BOOLEAN NOT NULL DEFAULT false,
    "status" "BracketStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRounds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketParticipant" (
    "id" SERIAL NOT NULL,
    "bracketId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "userId" INTEGER,
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketMatch" (
    "id" SERIAL NOT NULL,
    "bracketId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "nextMatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketMatchParticipant" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "participantId" INTEGER,
    "score" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "isBye" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BracketMatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_eventId_key" ON "Bracket"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketParticipant_bracketId_email_key" ON "BracketParticipant"("bracketId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "BracketMatch_bracketId_round_position_key" ON "BracketMatch"("bracketId", "round", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BracketMatchParticipant_matchId_participantId_key" ON "BracketMatchParticipant"("matchId", "participantId");

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketParticipant" ADD CONSTRAINT "BracketParticipant_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketParticipant" ADD CONSTRAINT "BracketParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "BracketMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatchParticipant" ADD CONSTRAINT "BracketMatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BracketMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatchParticipant" ADD CONSTRAINT "BracketMatchParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "BracketParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
