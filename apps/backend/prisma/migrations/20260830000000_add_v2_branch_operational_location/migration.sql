ALTER TABLE "v2_branches"
ADD COLUMN "operational_location_formatted_address" TEXT,
ADD COLUMN "operational_location_latitude" DOUBLE PRECISION,
ADD COLUMN "operational_location_longitude" DOUBLE PRECISION,
ADD COLUMN "operational_location_street" TEXT,
ADD COLUMN "operational_location_street_number" TEXT,
ADD COLUMN "operational_location_city" TEXT,
ADD COLUMN "operational_location_state_region" TEXT,
ADD COLUMN "operational_location_postal_code" TEXT,
ADD COLUMN "operational_location_country" TEXT,
ADD COLUMN "operational_location_provider_place_id" TEXT,
ADD CONSTRAINT "v2_branches_operational_location_completeness" CHECK (
  (
    "operational_location_formatted_address" IS NULL
    AND "operational_location_latitude" IS NULL
    AND "operational_location_longitude" IS NULL
  )
  OR
  (
    "operational_location_formatted_address" IS NOT NULL
    AND "operational_location_latitude" IS NOT NULL
    AND "operational_location_longitude" IS NOT NULL
  )
),
ADD CONSTRAINT "v2_branches_operational_location_latitude_bounds" CHECK (
  "operational_location_latitude" IS NULL
  OR "operational_location_latitude" BETWEEN -90 AND 90
),
ADD CONSTRAINT "v2_branches_operational_location_longitude_bounds" CHECK (
  "operational_location_longitude" IS NULL
  OR "operational_location_longitude" BETWEEN -180 AND 180
);
