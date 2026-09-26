-- AlterTable
ALTER TABLE "NavLink" ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false;

-- Seed default nav links (only if table is empty)
INSERT INTO "NavLink" ("label", "href", "position", "visibility", "isCta", "openInNewTab", "isProtected", "updatedAt")
SELECT "label", "href", "position", "visibility", "isCta", "openInNewTab", "isProtected", "updatedAt"
FROM (VALUES
  ('Home',      '/',              0, 'public', false, false, true, NOW()),
  ('Events',    '/events',        1, 'public', false, false, true, NOW()),
  ('Roster',    '/roster',        2, 'public', false, false, true, NOW()),
  ('Schedule',  '/schedule',      3, 'public', false, false, true, NOW()),
  ('Info',      '/info',          4, 'public', false, false, true, NOW()),
  ('Reserveer', '/reservations',  5, 'public', true,  false, true, NOW())
) AS defaults("label", "href", "position", "visibility", "isCta", "openInNewTab", "isProtected", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "NavLink");
