-- CreateTable
CREATE TABLE "rental_delivery_details" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_order_id" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_delivery_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_delivery_details_rental_order_id_key" ON "rental_delivery_details"("rental_order_id");

-- CreateIndex
CREATE INDEX "rental_delivery_details_tenant_id_idx" ON "rental_delivery_details"("tenant_id");

-- AddForeignKey
ALTER TABLE "rental_delivery_details" ADD CONSTRAINT "rental_delivery_details_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
