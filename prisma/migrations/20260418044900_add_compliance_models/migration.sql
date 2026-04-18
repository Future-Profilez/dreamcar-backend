-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "instantWinEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instantWinTriggerPercent" INTEGER;

-- CreateTable
CREATE TABLE "ComplianceQuestion" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,

    CONSTRAINT "ComplianceQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantWinPrize" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "InstantWinPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantWin" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "prizeId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedById" INTEGER,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "InstantWin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ComplianceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "ComplianceAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstantWin_competitionId_ticketNumber_key" ON "InstantWin"("competitionId", "ticketNumber");

-- AddForeignKey
ALTER TABLE "ComplianceQuestion" ADD CONSTRAINT "ComplianceQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantWinPrize" ADD CONSTRAINT "InstantWinPrize_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantWin" ADD CONSTRAINT "InstantWin_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantWin" ADD CONSTRAINT "InstantWin_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "InstantWinPrize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantWin" ADD CONSTRAINT "InstantWin_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceOption" ADD CONSTRAINT "ComplianceOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ComplianceQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAnswer" ADD CONSTRAINT "ComplianceAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ComplianceQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAnswer" ADD CONSTRAINT "ComplianceAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
