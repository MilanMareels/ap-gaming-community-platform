-- AlterTable: existing reservations keep a NULL createdAt, since when they were made is unknown.
ALTER TABLE "Reservation" ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "createdByStaff" BOOLEAN NOT NULL DEFAULT false;
