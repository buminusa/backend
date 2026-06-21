-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('Draft', 'Pending', 'Active', 'Rejected');

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name_role" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "company_name" VARCHAR(255),
    "slug" VARCHAR(255),
    "npwp" VARCHAR(50),
    "address" TEXT,
    "province" VARCHAR(100),
    "country" VARCHAR(100),
    "phone" VARCHAR(20),
    "logo_url" TEXT,
    "business_description" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name_categories" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER,
    "category_id" INTEGER,
    "nama" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "spectification" TEXT,
    "min_order" INTEGER NOT NULL DEFAULT 1,
    "unit" VARCHAR(50),
    "hs_code" VARCHAR(50),
    "views" INTEGER NOT NULL DEFAULT 0,
    "slug" VARCHAR(255),
    "status" "ProductStatus" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role_id" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_user_id_key" ON "company_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_slug_key" ON "company_profiles"("slug");

-- CreateIndex
CREATE INDEX "idx_company_profiles_user_id" ON "company_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_company_profiles_slug" ON "company_profiles"("slug");

-- CreateIndex
CREATE INDEX "idx_company_profiles_verification_status" ON "company_profiles"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_categories_slug" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "idx_product_supplier_id" ON "product"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_product_category_id" ON "product"("category_id");

-- CreateIndex
CREATE INDEX "idx_product_slug" ON "product"("slug");

-- CreateIndex
CREATE INDEX "idx_product_status" ON "product"("status");

-- CreateIndex
CREATE INDEX "idx_product_hs_code" ON "product"("hs_code");

-- CreateIndex
CREATE INDEX "idx_product_views" ON "product"("views" DESC);

-- CreateIndex
CREATE INDEX "idx_product_images_product_id" ON "product_images"("product_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
