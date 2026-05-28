-- CreateTable
CREATE TABLE "equipment_type_accessory_defaults" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "accessory_equipment_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_type_accessory_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_accessory_asset_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_order_id" TEXT NOT NULL,
    "rental_accessory_selection_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_accessory_asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_accessory_selections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_order_id" TEXT NOT NULL,
    "source_rental_demand_line_id" TEXT,
    "equipment_type_id" TEXT NOT NULL,
    "equipment_type_name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_accessory_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_type_accessory_defaults_tenant_id_idx" ON "equipment_type_accessory_defaults"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_type_accessory_defaults_equipment_type_id_idx" ON "equipment_type_accessory_defaults"("equipment_type_id");

-- CreateIndex
CREATE INDEX "equipment_type_accessory_defaults_accessory_equipment_type__idx" ON "equipment_type_accessory_defaults"("accessory_equipment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_type_accessory_defaults_tenant_id_equipment_type__key" ON "equipment_type_accessory_defaults"("tenant_id", "equipment_type_id", "accessory_equipment_type_id");

-- CreateIndex
CREATE INDEX "rental_accessory_asset_assignments_tenant_id_rental_order_i_idx" ON "rental_accessory_asset_assignments"("tenant_id", "rental_order_id");

-- CreateIndex
CREATE INDEX "rental_accessory_asset_assignments_asset_id_idx" ON "rental_accessory_asset_assignments"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_accessory_asset_assignments_rental_accessory_selecti_key" ON "rental_accessory_asset_assignments"("rental_accessory_selection_id", "asset_id");

-- CreateIndex
CREATE INDEX "rental_accessory_selections_tenant_id_rental_order_id_idx" ON "rental_accessory_selections"("tenant_id", "rental_order_id");

-- CreateIndex
CREATE INDEX "rental_accessory_selections_source_rental_demand_line_id_idx" ON "rental_accessory_selections"("source_rental_demand_line_id");

-- CreateIndex
CREATE INDEX "rental_accessory_selections_equipment_type_id_idx" ON "rental_accessory_selections"("equipment_type_id");

-- AddForeignKey
ALTER TABLE "equipment_type_accessory_defaults" ADD CONSTRAINT "equipment_type_accessory_defaults_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "v2_equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_type_accessory_defaults" ADD CONSTRAINT "equipment_type_accessory_defaults_accessory_equipment_type_fkey" FOREIGN KEY ("accessory_equipment_type_id") REFERENCES "v2_equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_accessory_asset_assignments" ADD CONSTRAINT "rental_accessory_asset_assignments_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_accessory_asset_assignments" ADD CONSTRAINT "rental_accessory_asset_assignments_rental_accessory_select_fkey" FOREIGN KEY ("rental_accessory_selection_id") REFERENCES "rental_accessory_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_accessory_selections" ADD CONSTRAINT "rental_accessory_selections_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_accessory_selections" ADD CONSTRAINT "rental_accessory_selections_source_rental_demand_line_id_fkey" FOREIGN KEY ("source_rental_demand_line_id") REFERENCES "v2_rental_demand_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
