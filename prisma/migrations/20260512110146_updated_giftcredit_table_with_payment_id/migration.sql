/*
  Warnings:

  - You are about to drop the column `code` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to drop the column `purchasedById` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to drop the column `redeemedById` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `GiftCredit` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[redeemcode]` on the table `GiftCredit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentId` to the `GiftCredit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `redeemcode` to the `GiftCredit` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `isRedeemed` on the `GiftCredit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "GiftCredit" DROP CONSTRAINT "GiftCredit_purchasedById_fkey";

-- DropForeignKey
ALTER TABLE "GiftCredit" DROP CONSTRAINT "GiftCredit_redeemedById_fkey";

-- DropIndex
DROP INDEX "GiftCredit_code_key";

-- AlterTable
ALTER TABLE "GiftCredit" DROP COLUMN "code",
DROP COLUMN "purchasedById",
DROP COLUMN "redeemedById",
ADD COLUMN     "paymentId" INTEGER NOT NULL,
ADD COLUMN     "purchasedBy" INTEGER,
ADD COLUMN     "redeemcode" TEXT NOT NULL,
ADD COLUMN     "redeemedBy" INTEGER,
ALTER COLUMN "amount" SET DATA TYPE INTEGER,
DROP COLUMN "isRedeemed",
ADD COLUMN     "isRedeemed" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GiftCredit_redeemcode_key" ON "GiftCredit"("redeemcode");

-- AddForeignKey
ALTER TABLE "GiftCredit" ADD CONSTRAINT "GiftCredit_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCredit" ADD CONSTRAINT "GiftCredit_redeemedBy_fkey" FOREIGN KEY ("redeemedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
