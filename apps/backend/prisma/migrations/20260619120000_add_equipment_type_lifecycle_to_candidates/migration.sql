ALTER TABLE "v2_rental_asset_candidates"
ADD COLUMN "equipment_type_is_active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "v2_rental_asset_candidates" AS candidate
SET "equipment_type_is_active" = equipment_type."is_active"
FROM "v2_equipment_types" AS equipment_type
WHERE equipment_type."id" = candidate."equipment_type_id"
  AND equipment_type."tenant_id" = candidate."tenant_id";
