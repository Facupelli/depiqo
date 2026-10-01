-- Capture legacy lifecycle and publication facts before removing their columns.
ALTER TABLE "v2_rentable_items"
  ADD COLUMN "archived_at" TIMESTAMPTZ(3);

ALTER TABLE "v2_rental_offers"
  ADD COLUMN "show_in_store" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "first_published_at" TIMESTAMPTZ(3);

UPDATE "v2_rentable_items"
SET "archived_at" = CURRENT_TIMESTAMP
WHERE "status" = 'ARCHIVED';

UPDATE "v2_rental_offers" AS offer
SET "show_in_store" = CASE WHEN item."status" = 'DRAFT' THEN false ELSE offer."is_visible" END,
    "is_rentable" = CASE WHEN item."status" = 'DRAFT' THEN false ELSE offer."is_rentable" END,
    "first_published_at" = CASE
      WHEN item."status" = 'DRAFT' THEN NULL
      WHEN item."status" = 'ACTIVE' AND offer."is_visible" AND offer."published_at" IS NULL THEN offer."created_at"
      ELSE offer."published_at"
    END
FROM "v2_rentable_items" AS item
WHERE item."id" = offer."rentable_item_id";

DROP INDEX "v2_rentable_items_tenant_id_status_category_id_idx";
DROP INDEX "v2_rental_offers_tenant_id_branch_id_is_visible_is_rentable_idx";

ALTER TABLE "v2_rental_offers"
  ALTER COLUMN "is_rentable" SET DEFAULT false,
  DROP COLUMN "is_visible",
  DROP COLUMN "published_at";

ALTER TABLE "v2_rentable_items" DROP COLUMN "status";
DROP TYPE "V2RentableItemStatus";

CREATE INDEX "v2_rentable_items_tenant_id_archived_at_category_id_idx"
  ON "v2_rentable_items"("tenant_id", "archived_at", "category_id");
CREATE INDEX "v2_rental_offers_tenant_branch_store_published_idx"
  ON "v2_rental_offers"("tenant_id", "branch_id", "show_in_store", "first_published_at");
CREATE INDEX "v2_rental_offers_tenant_branch_rentable_idx"
  ON "v2_rental_offers"("tenant_id", "branch_id", "is_rentable");
