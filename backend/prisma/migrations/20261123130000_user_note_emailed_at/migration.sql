-- Warnings are e-mailed per note now, instead of through a site-wide setting
ALTER TABLE "UserNote" ADD COLUMN "emailedAt" TIMESTAMP(3);

DELETE FROM "Setting" WHERE "key" = 'users.notes.emailWarnings';
