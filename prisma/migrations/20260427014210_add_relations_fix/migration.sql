/*
  Warnings:

  - You are about to drop the `ComplianceAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComplianceOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ComplianceAnswer" DROP CONSTRAINT "ComplianceAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceAnswer" DROP CONSTRAINT "ComplianceAnswer_userId_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceOption" DROP CONSTRAINT "ComplianceOption_questionId_fkey";

-- DropTable
DROP TABLE "ComplianceAnswer";

-- DropTable
DROP TABLE "ComplianceOption";

-- CreateTable
CREATE TABLE "StripePayment" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" "itemTypeEnum" NOT NULL,
    "stripePaymentId" TEXT,
    "sessionId" TEXT,
    "competitionId" INTEGER,
    "quantity" INTEGER,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),

    CONSTRAINT "StripePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "paymentId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "isEligible" BOOLEAN NOT NULL,
    "isInstantWin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_competitionId_ticketNumber_key" ON "Ticket"("competitionId", "ticketNumber");

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StripePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
