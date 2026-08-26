ALTER TABLE "v2_assigned_assets"
ADD COLUMN "effective_from" TIMESTAMPTZ(3),
ADD COLUMN "effective_until" TIMESTAMPTZ(3);

UPDATE "v2_assigned_assets" AS assigned_asset
SET "effective_from" = rental."period_start"
FROM "v2_rentals" AS rental
WHERE rental."id" = assigned_asset."rental_id";

ALTER TABLE "v2_assigned_assets"
ALTER COLUMN "effective_from" SET NOT NULL;

DROP INDEX "v2_assigned_assets_rental_demand_line_id_asset_id_key";

CREATE UNIQUE INDEX "v2_assigned_assets_rental_id_asset_id_open_key"
ON "v2_assigned_assets" ("rental_id", "asset_id")
WHERE "effective_until" IS NULL;
