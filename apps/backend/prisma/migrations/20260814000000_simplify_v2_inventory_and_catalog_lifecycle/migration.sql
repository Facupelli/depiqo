-- V2 data is pre-production. Remove obsolete lifecycle states rather than preserving them.
DELETE FROM "v2_rental_asset_candidates" candidate
USING "v2_assets" asset
LEFT JOIN "v2_equipment_types" equipment_type ON equipment_type."id" = asset."equipment_type_id"
WHERE candidate."tenant_id" = asset."tenant_id"
  AND candidate."asset_id" = asset."id"
  AND (asset."deleted_at" IS NOT NULL OR equipment_type."is_active" = false);

DELETE FROM "v2_owner_contracts" contract
USING "v2_assets" asset
LEFT JOIN "v2_equipment_types" equipment_type ON equipment_type."id" = asset."equipment_type_id"
WHERE contract."asset_id" = asset."id"
  AND (asset."deleted_at" IS NOT NULL OR equipment_type."is_active" = false);

DELETE FROM "v2_assets" asset
USING "v2_equipment_types" equipment_type
WHERE asset."equipment_type_id" = equipment_type."id"
  AND (asset."deleted_at" IS NOT NULL OR equipment_type."is_active" = false);

DELETE FROM "equipment_type_accessory_defaults"
WHERE "equipment_type_id" IN (SELECT "id" FROM "v2_equipment_types" WHERE "is_active" = false)
   OR "accessory_equipment_type_id" IN (SELECT "id" FROM "v2_equipment_types" WHERE "is_active" = false);

DELETE FROM "v2_fulfillment_requirements"
WHERE "equipment_type_id" IN (SELECT "id" FROM "v2_equipment_types" WHERE "is_active" = false);

DELETE FROM "v2_rental_offers"
WHERE "deleted_at" IS NOT NULL
   OR "rentable_item_id" IN (SELECT "id" FROM "v2_rentable_items" WHERE "deleted_at" IS NOT NULL);

DELETE FROM "v2_fulfillment_requirements"
WHERE "rentable_item_id" IN (SELECT "id" FROM "v2_rentable_items" WHERE "deleted_at" IS NOT NULL);

DELETE FROM "v2_rentable_items"
WHERE "deleted_at" IS NOT NULL;

DELETE FROM "v2_equipment_types"
WHERE "is_active" = false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "v2_rental_offers"
    GROUP BY "tenant_id", "branch_id", "rentable_item_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add V2 rental-offer uniqueness: duplicate tenant, branch, rentable-item rows remain after destructive cleanup.';
  END IF;
END $$;

DROP INDEX IF EXISTS "v2_asset_candidates_rentable_idx";
DROP INDEX IF EXISTS "v2_assets_tenant_id_branch_id_equipment_type_id_status_deleted_at_idx";
DROP INDEX IF EXISTS "v2_assets_tenant_id_equipment_type_id_branch_id_status_deleted_at_idx";
DROP INDEX IF EXISTS "v2_equipment_types_tenant_id_is_active_deleted_at_idx";
DROP INDEX IF EXISTS "v2_rentable_items_tenant_id_status_deleted_at_category_id_idx";
DROP INDEX IF EXISTS "v2_rental_offers_tenant_id_branch_id_is_visible_is_rentable_deleted_at_idx";
DROP INDEX IF EXISTS "v2_rental_asset_candidates_tenant_id_asset_id_idx";
DROP INDEX "v2_rental_offers_tenant_id_branch_id_rentable_item_id_delet_key";

ALTER TABLE "v2_assets" DROP COLUMN "deleted_at";
ALTER TABLE "v2_equipment_types" DROP COLUMN "is_active", DROP COLUMN "deleted_at";
ALTER TABLE "v2_rentable_items" DROP COLUMN "deleted_at";
ALTER TABLE "v2_rental_offers" DROP COLUMN "deleted_at";
ALTER TABLE "v2_rental_asset_candidates"
  DROP COLUMN "is_active",
  DROP COLUMN "is_rentable",
  DROP COLUMN "equipment_type_is_active";

CREATE UNIQUE INDEX "v2_rental_offers_tenant_branch_item_key"
  ON "v2_rental_offers"("tenant_id", "branch_id", "rentable_item_id");

CREATE INDEX "v2_assets_tenant_id_branch_id_equipment_type_id_status_idx"
  ON "v2_assets"("tenant_id", "branch_id", "equipment_type_id", "status");
CREATE INDEX "v2_assets_tenant_id_equipment_type_id_branch_id_status_idx"
  ON "v2_assets"("tenant_id", "equipment_type_id", "branch_id", "status");
CREATE INDEX "v2_equipment_types_tenant_id_idx" ON "v2_equipment_types"("tenant_id");
CREATE INDEX "v2_rentable_items_tenant_id_status_category_id_idx"
  ON "v2_rentable_items"("tenant_id", "status", "category_id");
CREATE INDEX "v2_rental_offers_tenant_id_branch_id_is_visible_is_rentable_idx"
  ON "v2_rental_offers"("tenant_id", "branch_id", "is_visible", "is_rentable");
