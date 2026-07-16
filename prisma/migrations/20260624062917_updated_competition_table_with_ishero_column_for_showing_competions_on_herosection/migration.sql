/*
  Warnings:

  - You are about to drop the `GiftCardProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "isHero" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "GiftCardProduct";
