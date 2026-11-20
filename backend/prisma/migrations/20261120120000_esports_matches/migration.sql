-- CreateEnum
CREATE TYPE "EsportsMatchResult" AS ENUM ('UPCOMING', 'WIN', 'LOSS', 'DRAW');

-- CreateTable
CREATE TABLE "EsportsMatch" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "opponent" TEXT NOT NULL,
    "competition" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "result" "EsportsMatchResult" NOT NULL,
    "ourScore" INTEGER,
    "opponentScore" INTEGER,
    "vodUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsportsMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EsportsMatch_gameId_playedAt_idx" ON "EsportsMatch"("gameId", "playedAt");

-- AddForeignKey
ALTER TABLE "EsportsMatch" ADD CONSTRAINT "EsportsMatch_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "RosterGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permission to manage match results, granted to the Admin role (prisma/seed.ts does the same for fresh databases)
INSERT INTO "Permission" ("key", "description") VALUES ('esports.results.manage', 'Manage esports match results')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'esports.results.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
