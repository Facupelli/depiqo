CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE v2_asset_blocks
  ADD CONSTRAINT v2_asset_blocks_active_asset_period_exclusion
  EXCLUDE USING gist (
    tenant_id WITH =,
    asset_id WITH =,
    period WITH &&
  )
  WHERE (released_at IS NULL);
