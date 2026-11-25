BEGIN;

ALTER TABLE "v2_branches"
  ADD COLUMN "rental_asset_before_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rental_asset_after_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "v2_branches_rental_asset_buffer_nonnegative" CHECK (
    "rental_asset_before_buffer_minutes" >= 0 AND "rental_asset_after_buffer_minutes" >= 0
  );

UPDATE "v2_branches" AS branch
SET
  "rental_asset_before_buffer_minutes" = COALESCE((tenant."config" #>> '{rentalAssetBuffer,beforeBufferMinutes}')::integer, 0),
  "rental_asset_after_buffer_minutes" = COALESCE((tenant."config" #>> '{rentalAssetBuffer,afterBufferMinutes}')::integer, 0)
FROM "v2_tenants" AS tenant
WHERE branch."tenant_id" = tenant."id";

COMMIT;
