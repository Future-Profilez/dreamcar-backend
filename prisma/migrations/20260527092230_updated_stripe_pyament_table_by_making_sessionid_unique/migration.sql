/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `StripePayment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StripePayment_sessionId_key" ON "StripePayment"("sessionId");
