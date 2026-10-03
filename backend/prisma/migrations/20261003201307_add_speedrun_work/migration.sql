-- CreateEnum
CREATE TYPE "SpeedrunCategoryType" AS ENUM ('FULL_GAME', 'PER_LEVEL');

-- CreateEnum
CREATE TYPE "SpeedrunVariableScope" AS ENUM ('GLOBAL', 'FULL_GAME', 'PER_LEVEL');

-- CreateEnum
CREATE TYPE "SpeedrunRunStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "SpeedrunGame" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "hasInGameTimer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeedrunGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunLevel" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunCategory" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rules" TEXT,
    "type" "SpeedrunCategoryType" NOT NULL,
    "playerType" TEXT NOT NULL DEFAULT 'exactly',
    "playerCount" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunVariable" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "name" TEXT NOT NULL,
    "isSubcategory" BOOLEAN NOT NULL DEFAULT false,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "scope" "SpeedrunVariableScope" NOT NULL DEFAULT 'GLOBAL',
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunVariableValue" (
    "id" SERIAL NOT NULL,
    "variableId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunVariableValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunRun" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "levelId" INTEGER,
    "submitterId" INTEGER NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "inGameTimeMs" INTEGER,
    "status" "SpeedrunRunStatus" NOT NULL DEFAULT 'PENDING',
    "verifierId" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "videoUrl" TEXT NOT NULL,
    "description" TEXT,
    "runDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeedrunRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunRunPlayer" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestName" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunRunPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeedrunRunVariableValue" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "variableId" INTEGER NOT NULL,
    "valueId" INTEGER NOT NULL,

    CONSTRAINT "SpeedrunRunVariableValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeedrunGame_slug_key" ON "SpeedrunGame"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpeedrunLevel_gameId_position_key" ON "SpeedrunLevel"("gameId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SpeedrunRunVariableValue_runId_variableId_key" ON "SpeedrunRunVariableValue"("runId", "variableId");

-- AddForeignKey
ALTER TABLE "SpeedrunLevel" ADD CONSTRAINT "SpeedrunLevel_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SpeedrunGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunCategory" ADD CONSTRAINT "SpeedrunCategory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SpeedrunGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunVariable" ADD CONSTRAINT "SpeedrunVariable_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SpeedrunGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunVariable" ADD CONSTRAINT "SpeedrunVariable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpeedrunCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunVariableValue" ADD CONSTRAINT "SpeedrunVariableValue_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "SpeedrunVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRun" ADD CONSTRAINT "SpeedrunRun_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SpeedrunGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRun" ADD CONSTRAINT "SpeedrunRun_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpeedrunCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRun" ADD CONSTRAINT "SpeedrunRun_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "SpeedrunLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRun" ADD CONSTRAINT "SpeedrunRun_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRun" ADD CONSTRAINT "SpeedrunRun_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRunPlayer" ADD CONSTRAINT "SpeedrunRunPlayer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SpeedrunRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRunPlayer" ADD CONSTRAINT "SpeedrunRunPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRunVariableValue" ADD CONSTRAINT "SpeedrunRunVariableValue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SpeedrunRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRunVariableValue" ADD CONSTRAINT "SpeedrunRunVariableValue_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "SpeedrunVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedrunRunVariableValue" ADD CONSTRAINT "SpeedrunRunVariableValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "SpeedrunVariableValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
