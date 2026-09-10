-- Refuse to enforce the source-demand-line foreign key while scalar references
-- violate application-owned rental and tenant boundaries or point at tombstones.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "rental_accessory_selections" AS accessory
    LEFT JOIN "v2_rental_demand_lines" AS demand_line
      ON demand_line."id" = accessory."source_rental_demand_line_id"
    WHERE accessory."source_rental_demand_line_id" IS NOT NULL
      AND demand_line."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add rental accessory source demand line FK: source_rental_demand_line_id references a missing demand line.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "rental_accessory_selections" AS accessory
    JOIN "v2_rental_demand_lines" AS demand_line
      ON demand_line."id" = accessory."source_rental_demand_line_id"
    WHERE accessory."rental_order_id" <> demand_line."rental_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add rental accessory source demand line FK: a scalar source relationship crosses rentals.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "rental_accessory_selections" AS accessory
    JOIN "v2_rental_demand_lines" AS demand_line
      ON demand_line."id" = accessory."source_rental_demand_line_id"
    WHERE accessory."tenant_id" <> demand_line."tenant_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add rental accessory source demand line FK: a scalar source relationship crosses tenants.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "rental_accessory_selections" AS accessory
    JOIN "v2_rental_demand_lines" AS demand_line
      ON demand_line."id" = accessory."source_rental_demand_line_id"
    WHERE demand_line."removed_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add rental accessory source demand line FK: source_rental_demand_line_id references a removed demand line.';
  END IF;
END $$;

-- Audit the obsolete implicit many-to-many representation before removing it.
-- Exact duplicates of the valid scalar relationship are deterministic and need
-- no data rewrite. Every other populated shape requires manual review.
DO $$
DECLARE
  join_row_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO join_row_count
  FROM "_V2RentalAccessorySelectionToV2RentalDemandLine";

  IF join_row_count > 0 THEN
    RAISE NOTICE 'Found % legacy rental accessory source join-table row(s); validating them against source_rental_demand_line_id before removal.', join_row_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_V2RentalAccessorySelectionToV2RentalDemandLine"
    GROUP BY "A"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy rental accessory source join table: an accessory is linked to multiple demand lines.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_V2RentalAccessorySelectionToV2RentalDemandLine" AS legacy
    JOIN "rental_accessory_selections" AS accessory ON accessory."id" = legacy."A"
    WHERE accessory."source_rental_demand_line_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy rental accessory source join table: a join-table relationship has a null scalar source.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_V2RentalAccessorySelectionToV2RentalDemandLine" AS legacy
    JOIN "rental_accessory_selections" AS accessory ON accessory."id" = legacy."A"
    WHERE accessory."source_rental_demand_line_id" <> legacy."B"
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy rental accessory source join table: a join-table source disagrees with source_rental_demand_line_id.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_V2RentalAccessorySelectionToV2RentalDemandLine" AS legacy
    JOIN "rental_accessory_selections" AS accessory ON accessory."id" = legacy."A"
    JOIN "v2_rental_demand_lines" AS demand_line ON demand_line."id" = legacy."B"
    WHERE accessory."rental_order_id" <> demand_line."rental_id"
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy rental accessory source join table: a join-table relationship crosses rentals.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_V2RentalAccessorySelectionToV2RentalDemandLine" AS legacy
    JOIN "rental_accessory_selections" AS accessory ON accessory."id" = legacy."A"
    JOIN "v2_rental_demand_lines" AS demand_line ON demand_line."id" = legacy."B"
    WHERE accessory."tenant_id" <> demand_line."tenant_id"
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy rental accessory source join table: a join-table relationship crosses tenants.';
  END IF;
END $$;

ALTER TABLE "rental_accessory_selections"
ADD CONSTRAINT "rental_accessory_selections_source_rental_demand_line_id_fkey"
FOREIGN KEY ("source_rental_demand_line_id")
REFERENCES "v2_rental_demand_lines"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

DROP TABLE "_V2RentalAccessorySelectionToV2RentalDemandLine";
