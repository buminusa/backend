/*
  Warnings:

  - Made the column `company_name` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `slug` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `npwp` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `province` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_description` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "company_profiles" ALTER COLUMN "company_name" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "npwp" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "province" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "business_description" SET NOT NULL;

-- CreateTable
CREATE TABLE "buyer_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "full_name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buyer_profiles_user_id_key" ON "buyer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_buyer_profiles_user_id" ON "buyer_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
