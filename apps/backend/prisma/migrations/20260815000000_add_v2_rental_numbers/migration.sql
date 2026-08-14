ALTER TABLE "v2_rentals" ADD COLUMN "rental_number" INTEGER;

WITH numbered_rentals AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY created_at ASC, id ASC
    )::INTEGER AS rental_number
  FROM "v2_rentals"
)
UPDATE "v2_rentals" AS rentals
SET "rental_number" = numbered_rentals.rental_number
FROM numbered_rentals
WHERE rentals.id = numbered_rentals.id;

ALTER TABLE "v2_rentals"
  ALTER COLUMN "rental_number" SET NOT NULL,
  ADD CONSTRAINT "v2_rentals_rental_number_positive" CHECK ("rental_number" > 0);

CREATE UNIQUE INDEX "v2_rentals_tenant_id_rental_number_key"
  ON "v2_rentals"("tenant_id", "rental_number");

CREATE TABLE "v2_rental_number_counters" (
  "tenant_id" TEXT NOT NULL,
  "last_issued_number" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "v2_rental_number_counters_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "v2_rental_number_counters_last_issued_number_nonnegative"
    CHECK ("last_issued_number" >= 0)
);

INSERT INTO "v2_rental_number_counters" ("tenant_id", "last_issued_number")
SELECT "tenant_id", MAX("rental_number")
FROM "v2_rentals"
GROUP BY "tenant_id";
