ALTER TABLE "v2_assigned_assets"
ADD COLUMN "ownership_snapshot" JSONB;

UPDATE "v2_assigned_assets" AS assigned_asset
SET "ownership_snapshot" = jsonb_build_object(
  'kind', 'THIRD_PARTY',
  'ownerId', owner_split."owner_id",
  'contractId', owner_split."contract_id",
  'basis', owner_split."basis"::text,
  'ownerShare', owner_split."owner_share"::text
)
FROM "v2_rental_owner_splits" AS owner_split
WHERE owner_split."assigned_asset_id" = assigned_asset."id";

UPDATE "v2_assigned_assets"
SET "ownership_snapshot" = jsonb_build_object('kind', 'TENANT_OWNED')
WHERE "ownership_snapshot" IS NULL;

ALTER TABLE "v2_assigned_assets"
ALTER COLUMN "ownership_snapshot" SET NOT NULL;
