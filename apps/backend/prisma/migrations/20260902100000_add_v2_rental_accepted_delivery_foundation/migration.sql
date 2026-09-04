ALTER TABLE "v2_rentals"
  ADD COLUMN "accepted_delivery_snapshot" JSONB,
  ADD COLUMN "accepted_customer_total" DECIMAL(19,4);

UPDATE "v2_rentals"
SET "fulfillment_method" = 'PICKUP',
    "accepted_delivery_snapshot" = NULL,
    "accepted_customer_total" = ("price_snapshot" ->> 'total')::DECIMAL(19,4)
WHERE "confirmed_at" IS NOT NULL
  AND "price_snapshot" IS NOT NULL;

ALTER TABLE "v2_rentals"
  ADD CONSTRAINT "v2_rentals_confirmed_customer_total_required"
  CHECK ("confirmed_at" IS NULL OR "accepted_customer_total" IS NOT NULL);
