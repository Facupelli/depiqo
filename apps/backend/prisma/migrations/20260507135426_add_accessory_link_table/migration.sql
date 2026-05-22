-- CreateTable
CREATE TABLE "accessory_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "primary_rental_item_id" TEXT NOT NULL,
    "accessory_rental_item_id" TEXT NOT NULL,
    "is_default_included" BOOLEAN NOT NULL DEFAULT false,
    "default_quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessory_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accessory_links_tenant_id_primary_rental_item_id_idx" ON "accessory_links"("tenant_id", "primary_rental_item_id");

-- CreateIndex
CREATE INDEX "accessory_links_tenant_id_accessory_rental_item_id_idx" ON "accessory_links"("tenant_id", "accessory_rental_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "accessory_links_tenant_id_primary_rental_item_id_accessory__key" ON "accessory_links"("tenant_id", "primary_rental_item_id", "accessory_rental_item_id");

-- AddForeignKey
ALTER TABLE "accessory_links" ADD CONSTRAINT "accessory_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_links" ADD CONSTRAINT "accessory_links_primary_rental_item_id_fkey" FOREIGN KEY ("primary_rental_item_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_links" ADD CONSTRAINT "accessory_links_accessory_rental_item_id_fkey" FOREIGN KEY ("accessory_rental_item_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
