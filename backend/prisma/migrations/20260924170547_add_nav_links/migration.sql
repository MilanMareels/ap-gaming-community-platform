-- CreateTable
CREATE TABLE "NavLink" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "icon" TEXT,
    "parentId" INTEGER,
    "position" INTEGER NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "isCta" BOOLEAN NOT NULL DEFAULT false,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NavLink" ADD CONSTRAINT "NavLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
