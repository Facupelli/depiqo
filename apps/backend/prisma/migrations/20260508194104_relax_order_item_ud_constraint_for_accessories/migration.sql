ALTER TABLE "asset_assignments"
  DROP CONSTRAINT IF EXISTS "assignment_type_order_consistency";

ALTER TABLE "asset_assignments"
  ADD CONSTRAINT "assignment_type_order_consistency" CHECK (
    ("type" = 'ORDER'::"AssignmentType" AND "order_id" IS NOT NULL 
     AND ("order_item_id" IS NOT NULL OR "order_item_accessory_id" IS NOT NULL))
    OR
    ("type" = 'BLACKOUT'::"AssignmentType" AND "order_id" IS NULL AND "order_item_id" IS NULL)
    OR
    ("type" = 'MAINTENANCE'::"AssignmentType" AND "order_id" IS NULL AND "order_item_id" IS NULL)
  );
