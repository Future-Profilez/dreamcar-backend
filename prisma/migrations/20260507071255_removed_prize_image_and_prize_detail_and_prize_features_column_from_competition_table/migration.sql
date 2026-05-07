/*
  Warnings:

  - You are about to drop the column `prizeDetail` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `prizeDetailImage` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `prizeFeatures` on the `Competition` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Competition` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Competition" DROP COLUMN "prizeDetail",
DROP COLUMN "prizeDetailImage",
DROP COLUMN "prizeFeatures",
ADD COLUMN     "instantWinGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");
