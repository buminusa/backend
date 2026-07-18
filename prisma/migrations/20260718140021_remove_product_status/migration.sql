/*
  Warnings:

  - You are about to drop the column `status` on the `product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_product_status";

-- AlterTable
ALTER TABLE "product" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProductStatus";
