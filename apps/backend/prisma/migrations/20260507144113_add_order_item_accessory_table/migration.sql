-- AlterTable
ALTER TABLE "asset_assignments" ADD COLUMN     "order_item_accessory_id" TEXT;

-- CreateTable
CREATE TABLE "order_item_accessories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "accessory_rental_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_item_accessories_tenant_id_order_id_idx" ON "order_item_accessories"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_item_accessories_order_item_id_idx" ON "order_item_accessories"("order_item_id");

-- CreateIndex
CREATE INDEX "order_item_accessories_accessory_rental_item_id_idx" ON "order_item_accessories"("accessory_rental_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_accessories_order_item_id_accessory_rental_item__key" ON "order_item_accessories"("order_item_id", "accessory_rental_item_id");

-- CreateIndex
CREATE INDEX "asset_assignments_order_item_accessory_id_idx" ON "asset_assignments"("order_item_accessory_id");

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_order_item_accessory_id_fkey" FOREIGN KEY ("order_item_accessory_id") REFERENCES "order_item_accessories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_accessories" ADD CONSTRAINT "order_item_accessories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_accessories" ADD CONSTRAINT "order_item_accessories_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_accessories" ADD CONSTRAINT "order_item_accessories_accessory_rental_item_id_fkey" FOREIGN KEY ("accessory_rental_item_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
