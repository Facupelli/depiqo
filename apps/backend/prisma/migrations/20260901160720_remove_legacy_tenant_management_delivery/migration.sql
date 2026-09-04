ALTER TABLE "v2_branches"
  DROP COLUMN "supports_delivery",
  DROP COLUMN "delivery_default_country",
  DROP COLUMN "delivery_default_state_region",
  DROP COLUMN "delivery_default_city",
  DROP COLUMN "delivery_default_postal_code";

ALTER TABLE "locations"
  DROP COLUMN "supports_delivery",
  DROP COLUMN "delivery_default_country",
  DROP COLUMN "delivery_default_state_region",
  DROP COLUMN "delivery_default_city",
  DROP COLUMN "delivery_default_postal_code";
