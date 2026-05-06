-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "prizeDetail" TEXT NOT NULL,
    "prizeDetailImage" TEXT NOT NULL,
    "prizeFeatures" TEXT[],
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prize_competitionId_position_key" ON "Prize"("competitionId", "position");

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
