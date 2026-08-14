-- The initial V2 migration created this table under its former name, while the
-- Prisma schema has always mapped V2AssignedAsset to v2_assigned_assets.
-- Rename rather than recreate so existing rental assignment facts are retained.
ALTER TABLE "v2_assigned_asset_references" RENAME TO "v2_assigned_assets";
