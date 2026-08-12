-- Renaming preserves all existing rows and IDs while removing rentable-item-specific persistence naming.
ALTER TABLE "rentable_item_categories" RENAME TO "v2_categories";

ALTER TABLE "v2_equipment_types" ADD COLUMN "category_id" TEXT;

CREATE INDEX "v2_equipment_types_tenant_id_category_id_idx"
  ON "v2_equipment_types"("tenant_id", "category_id");

ALTER TABLE "v2_equipment_types"
  ADD CONSTRAINT "v2_equipment_types_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "v2_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
