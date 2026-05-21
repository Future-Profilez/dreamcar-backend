-- CreateTable
CREATE TABLE "WinnerDetail" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "resultId" TEXT NOT NULL,
    "winnerName" TEXT NOT NULL,
    "winnerLocation" TEXT,
    "storyDescription" TEXT,
    "winnerImage" TEXT,
    "galleryImages" TEXT[],
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "WinnerDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WinnerDetail_competitionId_key" ON "WinnerDetail"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "WinnerDetail_resultId_key" ON "WinnerDetail"("resultId");

-- AddForeignKey
ALTER TABLE "WinnerDetail" ADD CONSTRAINT "WinnerDetail_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinnerDetail" ADD CONSTRAINT "WinnerDetail_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
