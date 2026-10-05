-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SELECT', 'CHECKBOX', 'FILE_UPLOAD', 'TEXT_BLOCK');

-- CreateTable
CREATE TABLE "dynamic_form" (
    "id" SERIAL NOT NULL,
    "cuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "confirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "discordWebhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_form_field" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "config" JSONB,

    CONSTRAINT "dynamic_form_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_form_submission" (
    "id" SERIAL NOT NULL,
    "cuid" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "userId" INTEGER,
    "submitterEmail" TEXT,
    "submitterName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynamic_form_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_form_submission_answer" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "value" TEXT,
    "values" JSONB,
    "filePath" TEXT,
    "fileName" TEXT,

    CONSTRAINT "dynamic_form_submission_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_form_submission_comment" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "userId" INTEGER,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynamic_form_submission_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "formId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_form_cuid_key" ON "dynamic_form"("cuid");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_form_submission_cuid_key" ON "dynamic_form_submission"("cuid");

-- AddForeignKey
ALTER TABLE "dynamic_form_field" ADD CONSTRAINT "dynamic_form_field_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission" ADD CONSTRAINT "dynamic_form_submission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission" ADD CONSTRAINT "dynamic_form_submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission_answer" ADD CONSTRAINT "dynamic_form_submission_answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "dynamic_form_submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission_answer" ADD CONSTRAINT "dynamic_form_submission_answer_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "dynamic_form_field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission_comment" ADD CONSTRAINT "dynamic_form_submission_comment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "dynamic_form_submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submission_comment" ADD CONSTRAINT "dynamic_form_submission_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
