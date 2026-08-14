/*
  Warnings:

  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "v2_tenant_users_email_tenant_id_key";

-- DropTable
DROP TABLE "session";

-- CreateTable
CREATE TABLE "rentable_item_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentable_item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rentable_item_categories_tenant_id_is_active_deleted_at_idx" ON "rentable_item_categories"("tenant_id", "is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "rentable_item_categories_tenant_id_slug_deleted_at_key" ON "rentable_item_categories"("tenant_id", "slug", "deleted_at");

-- AddForeignKey
ALTER TABLE "v2_rentable_items" ADD CONSTRAINT "v2_rentable_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "rentable_item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
