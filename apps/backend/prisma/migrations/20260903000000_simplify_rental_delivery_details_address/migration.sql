ALTER TABLE "rental_delivery_details"
ADD COLUMN "address" TEXT;

UPDATE "rental_delivery_details"
SET "address" = NULLIF(
  concat_ws(
    ', ',
    NULLIF(btrim("address_line_1"), ''),
    NULLIF(btrim("address_line_2"), ''),
    NULLIF(btrim("city"), ''),
    NULLIF(btrim("state"), ''),
    NULLIF(btrim("postal_code"), ''),
    NULLIF(btrim("country"), '')
  ),
  ''
);

ALTER TABLE "rental_delivery_details"
ALTER COLUMN "address" SET NOT NULL,
DROP COLUMN "address_line_1",
DROP COLUMN "address_line_2",
DROP COLUMN "city",
DROP COLUMN "state",
DROP COLUMN "postal_code",
DROP COLUMN "country",
DROP COLUMN "contact_name",
DROP COLUMN "contact_phone",
DROP COLUMN "notes",
ADD CONSTRAINT "rental_delivery_details_address_valid_check"
CHECK (
  "address" = btrim("address")
  AND length("address") > 0
);
