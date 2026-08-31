UPDATE "v2_tenants"
SET "config" = jsonb_set(
  "config",
  '{rentalAssetBuffer}',
  COALESCE("config"->'rentalAssetBuffer', '{}'::jsonb) || jsonb_build_object(
    'beforeBufferMinutes', 0,
    'afterBufferMinutes', 0
  ),
  true
);

ALTER TABLE "v2_rentals"
ADD COLUMN "accepted_before_buffer_minutes" INTEGER,
ADD COLUMN "accepted_after_buffer_minutes" INTEGER;

UPDATE "v2_rentals"
SET
  "accepted_before_buffer_minutes" = 0,
  "accepted_after_buffer_minutes" = 0
WHERE "status" = 'CONFIRMED'
  OR "confirmed_at" IS NOT NULL;

ALTER TABLE "v2_rentals"
ADD CONSTRAINT "v2_rentals_accepted_asset_buffer_valid" CHECK (
  (
    "accepted_before_buffer_minutes" IS NULL
    AND "accepted_after_buffer_minutes" IS NULL
  )
  OR (
    "accepted_before_buffer_minutes" IS NOT NULL
    AND "accepted_after_buffer_minutes" IS NOT NULL
    AND "accepted_before_buffer_minutes" >= 0
    AND "accepted_after_buffer_minutes" >= 0
  )
);
