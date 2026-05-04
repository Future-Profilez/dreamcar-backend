/*
  Warnings:

  - A unique constraint covering the columns `[ticketId]` on the table `InstantWin` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InstantWin" ADD COLUMN     "ticketId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ticketCode" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(0),
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(0);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "ticketId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Result_competitionId_position_key" ON "Result"("competitionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InstantWin_ticketId_key" ON "InstantWin"("ticketId");

-- AddForeignKey
ALTER TABLE "InstantWin" ADD CONSTRAINT "InstantWin_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
