-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "cuid" TEXT;

-- Generate CUIDs for existing rows using a PostgreSQL function to generate unique IDs
-- We'll use a combination of timestamp and random string similar to CUID format
UPDATE "Reservation"
SET "cuid" = 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24)
WHERE "cuid" IS NULL;

-- AlterTable - Make cuid NOT NULL
ALTER TABLE "Reservation" ALTER COLUMN "cuid" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_cuid_key" ON "Reservation"("cuid");
