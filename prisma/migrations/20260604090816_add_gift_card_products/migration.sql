-- CreateTable
CREATE TABLE "GiftCardProduct" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0),

    CONSTRAINT "GiftCardProduct_pkey" PRIMARY KEY ("id")
);
