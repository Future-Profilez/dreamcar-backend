-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "endingEmailSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newEmailSent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingEmails" INTEGER NOT NULL DEFAULT 1;
