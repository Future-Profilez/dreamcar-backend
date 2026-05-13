/*
  Warnings:

  - You are about to drop the column `paymentId` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to drop the column `purchasedBy` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to drop the column `redeemcode` on the `GiftCredit` table. All the data in the column will be lost.
  - You are about to drop the column `redeemedBy` on the `GiftCredit` table. All the data in the column will be lost.
  - The `type` column on the `StripePayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `balance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `WalletTransaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `balance` on the `WalletTransaction` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[code]` on the table `GiftCredit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `GiftCredit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletId` to the `WalletTransaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `WalletTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('credit', 'debit');

-- DropForeignKey
ALTER TABLE "GiftCredit" DROP CONSTRAINT "GiftCredit_purchasedBy_fkey";

-- DropForeignKey
ALTER TABLE "GiftCredit" DROP CONSTRAINT "GiftCredit_redeemedBy_fkey";

-- DropIndex
DROP INDEX "GiftCredit_redeemcode_key";

-- DropIndex
DROP INDEX "WalletTransaction_userId_key";

-- AlterTable
ALTER TABLE "GiftCredit" DROP COLUMN "paymentId",
DROP COLUMN "purchasedBy",
DROP COLUMN "redeemcode",
DROP COLUMN "redeemedBy",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "purchasedById" INTEGER,
ADD COLUMN     "redeemedById" INTEGER,
ALTER COLUMN "isRedeemed" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "StripePayment" DROP COLUMN "type",
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "updatedAt" TIMESTAMP(0),
ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "stripePaymentId" TEXT,
ADD COLUMN     "walletId" INTEGER NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "WalletTransactionType" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCredit_code_key" ON "GiftCredit"("code");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_stripePaymentId_fkey" FOREIGN KEY ("stripePaymentId") REFERENCES "StripePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCredit" ADD CONSTRAINT "GiftCredit_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCredit" ADD CONSTRAINT "GiftCredit_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
