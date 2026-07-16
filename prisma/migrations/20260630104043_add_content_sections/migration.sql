-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "reservedTickets" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TicketReservation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),

    CONSTRAINT "TicketReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSection" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "video" TEXT,
    "description" TEXT NOT NULL,
    "specs" TEXT[],
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "ContentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketReservation_status_expiresAt_idx" ON "TicketReservation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketReservation_sessionId_competitionId_key" ON "TicketReservation"("sessionId", "competitionId");

-- AddForeignKey
ALTER TABLE "TicketReservation" ADD CONSTRAINT "TicketReservation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
