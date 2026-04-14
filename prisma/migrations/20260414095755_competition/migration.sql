/*
  Warnings:

  - You are about to drop the column `detailImage` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `rulesImage` on the `Competition` table. All the data in the column will be lost.
  - The `prizeFeatures` column on the `Competition` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Competition" DROP COLUMN "detailImage",
DROP COLUMN "rules",
DROP COLUMN "rulesImage",
DROP COLUMN "prizeFeatures",
ADD COLUMN     "prizeFeatures" TEXT[];
