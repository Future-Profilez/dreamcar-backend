/*
  Warnings:

  - Added the required column `fullName` to the `Newsletter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Newsletter" ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT;
