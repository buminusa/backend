/*
  Warnings:

  - Added the required column `price_max` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_min` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product" ADD COLUMN     "price_max" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "price_min" DECIMAL(15,2) NOT NULL;
