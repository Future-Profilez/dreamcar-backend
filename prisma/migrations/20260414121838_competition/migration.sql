-- CreateEnum
CREATE TYPE "productTypeEnum" AS ENUM ('car_bike', 'tech_luxury', 'cash');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "productType" "productTypeEnum" NOT NULL DEFAULT 'car_bike';
