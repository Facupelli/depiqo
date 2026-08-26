-- Manufacturer serial numbers are not tenant-wide identifiers and may repeat.
-- This also removes the column left behind when the original migration failed.
ALTER TABLE "v2_assets"
DROP COLUMN IF EXISTS "serial_number_normalized";
