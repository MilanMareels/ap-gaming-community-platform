-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ANONYMOUS', 'SYSTEM');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" INTEGER,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "realActorId" INTEGER,
    "realActorEmail" TEXT,
    "realActorName" TEXT,
    "impersonatedRole" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "durationMs" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "request" JSONB,
    "details" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditChange" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "entityId" TEXT,
    "operation" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "changedFields" TEXT[],

    CONSTRAINT "AuditChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_realActorId_createdAt_idx" ON "AuditEvent"("realActorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditChange_eventId_idx" ON "AuditChange"("eventId");

-- CreateIndex
CREATE INDEX "AuditChange_model_entityId_idx" ON "AuditChange"("model", "entityId");

-- AddForeignKey
ALTER TABLE "AuditChange" ADD CONSTRAINT "AuditChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AuditEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permission to read the audit log, granted to the Admin role
INSERT INTO "Permission" ("key", "description") VALUES ('audit.view', 'View the audit log of everything that happened on the site')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'audit.view'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
