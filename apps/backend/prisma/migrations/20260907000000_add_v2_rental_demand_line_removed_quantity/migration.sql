ALTER TABLE "v2_rental_demand_lines"
ADD COLUMN "removed_quantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "v2_rental_demand_lines"
SET "removed_quantity" = "quantity"
WHERE "removed_at" IS NOT NULL;
