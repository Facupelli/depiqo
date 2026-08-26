ALTER TABLE "v2_rental_selections"
ADD COLUMN "removed_at" TIMESTAMPTZ(3);

ALTER TABLE "v2_rental_demand_lines"
ADD COLUMN "removed_at" TIMESTAMPTZ(3);
