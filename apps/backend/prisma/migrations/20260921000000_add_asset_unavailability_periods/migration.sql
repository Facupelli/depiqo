ALTER TYPE "V2AssetBlockType" ADD VALUE 'TEMPORARY_UNAVAILABILITY';

ALTER TABLE v2_asset_blocks
  ALTER COLUMN rental_id DROP NOT NULL,
  ADD COLUMN unavailability_reason TEXT,
  ADD CONSTRAINT v2_asset_blocks_valid_source CHECK (
    CASE WHEN block_type::text = 'TEMPORARY_UNAVAILABILITY' THEN
      rental_id IS NULL
      AND unavailability_reason IS NOT NULL
      AND char_length(btrim(unavailability_reason)) BETWEEN 1 AND 500
      AND NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)
      AND isfinite(lower(period)) AND isfinite(upper(period))
      AND lower_inc(period) AND NOT upper_inc(period)
    ELSE
      rental_id IS NOT NULL AND unavailability_reason IS NULL
    END
  );
