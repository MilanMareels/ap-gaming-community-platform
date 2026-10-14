-- AlterTable
ALTER TABLE "NavLink" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "dynamic_form_access" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "dynamic_form_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_form_access_formId_roleId_key" ON "dynamic_form_access"("formId", "roleId");

-- AddForeignKey
ALTER TABLE "dynamic_form_access" ADD CONSTRAINT "dynamic_form_access_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_access" ADD CONSTRAINT "dynamic_form_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
