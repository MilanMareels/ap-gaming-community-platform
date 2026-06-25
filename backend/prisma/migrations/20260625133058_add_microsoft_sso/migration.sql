-- CreateTable
CREATE TABLE "MicrosoftSSOUser" (
    "id" SERIAL NOT NULL,
    "ssoId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MicrosoftSSOUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftSSOUser_ssoId_key" ON "MicrosoftSSOUser"("ssoId");

-- AddForeignKey
ALTER TABLE "MicrosoftSSOUser" ADD CONSTRAINT "MicrosoftSSOUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
