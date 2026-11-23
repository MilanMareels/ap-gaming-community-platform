-- CreateEnum
CREATE TYPE "UserNoteType" AS ENUM ('NOTE', 'WARNING', 'BLOCK');

-- AlterTable
ALTER TABLE "UserNote" ADD COLUMN "type" "UserNoteType" NOT NULL DEFAULT 'NOTE',
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserNote_userId_type_expiresAt_idx" ON "UserNote"("userId", "type", "expiresAt");

-- Permission to block someone from the site, granted to the Admin role
INSERT INTO "Permission" ("key", "description") VALUES ('users.block', 'Block users from the site')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'users.block'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- The permission to delete others' notes now also covers editing and ending them
UPDATE "Permission" SET "description" = 'Edit, end and delete notes written by others' WHERE "key" = 'users.notes.delete_others';
