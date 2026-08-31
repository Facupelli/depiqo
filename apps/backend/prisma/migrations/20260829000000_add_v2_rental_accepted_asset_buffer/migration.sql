ALTER TABLE "v2_rentals"
ADD COLUMN "accepted_before_buffer_minutes" INTEGER,
ADD COLUMN "accepted_after_buffer_minutes" INTEGER,
ADD CONSTRAINT "v2_rentals_accepted_asset_buffer_valid" CHECK (
  (
    accepted_before_buffer_minutes IS NULL
    AND accepted_after_buffer_minutes IS NULL
  )
  OR (
    accepted_before_buffer_minutes IS NOT NULL
    AND accepted_after_buffer_minutes IS NOT NULL
    AND accepted_before_buffer_minutes >= 0
    AND accepted_after_buffer_minutes >= 0
  )
);
