UPDATE "v2_rentals"
SET "fulfillment_method" = 'PICKUP'::"V2FulfillmentMethod"
WHERE "fulfillment_method" IS NULL;

ALTER TABLE "v2_rentals"
ALTER COLUMN "fulfillment_method" SET NOT NULL;
