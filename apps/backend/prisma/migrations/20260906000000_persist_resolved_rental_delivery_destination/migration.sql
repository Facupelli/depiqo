-- Remove the one known obsolete Delivery draft that cannot be backfilled because
-- it has no accepted Delivery snapshot. All deletes are deliberately scoped to
-- this rental ID and ordered around the existing RESTRICT foreign keys.
DELETE FROM "rental_accessory_asset_assignments"
WHERE "rental_order_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "rental_accessory_selections"
WHERE "rental_order_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_rental_owner_splits"
WHERE "rental_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_assigned_assets"
WHERE "rental_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_asset_blocks"
WHERE "rental_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_rental_demand_lines"
WHERE "rental_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_rental_selections"
WHERE "rental_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "rental_delivery_details"
WHERE "rental_order_id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

DELETE FROM "v2_rentals"
WHERE "id" = '99360a37-3094-4ed1-9a5f-7c4459764698';

-- No other persisted Delivery destination can be upgraded safely without
-- geocoding or inventing coordinates. Fail explicitly instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "rental_delivery_details") THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot require resolved rental delivery destinations: unexpected rental_delivery_details rows remain after removing obsolete rental 99360a37-3094-4ed1-9a5f-7c4459764698.',
      HINT = 'Audit and resolve the incompatible Delivery rental data before applying this migration.';
  END IF;

  IF EXISTS (SELECT 1 FROM "v2_rentals" WHERE "fulfillment_method" = 'DELIVERY') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot require resolved rental delivery destinations: unexpected DELIVERY rentals remain after removing obsolete rental 99360a37-3094-4ed1-9a5f-7c4459764698.',
      HINT = 'Audit and resolve the incompatible Delivery rental data before applying this migration.';
  END IF;
END $$;

ALTER TABLE "rental_delivery_details"
  ADD COLUMN "formatted_address" TEXT NOT NULL,
  ADD COLUMN "latitude" DOUBLE PRECISION NOT NULL,
  ADD COLUMN "longitude" DOUBLE PRECISION NOT NULL,
  ADD COLUMN "provider_place_id" TEXT,
  ADD CONSTRAINT "rental_delivery_details_formatted_address_valid_check"
    CHECK (
      "formatted_address" = btrim("formatted_address")
      AND length("formatted_address") > 0
    ),
  ADD CONSTRAINT "rental_delivery_details_latitude_valid_check"
    CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "rental_delivery_details_longitude_valid_check"
    CHECK ("longitude" BETWEEN -180 AND 180);
