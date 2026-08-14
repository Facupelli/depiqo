-- The original V2 notification tables were never used by application code and
-- are replaced by the finalized notification persistence model in a subsequent migration.
-- Drop dependents before their referenced tables and enum.
DROP TABLE "v2_notification_deliveries";
DROP TABLE "v2_notifications";
DROP TABLE "v2_notification_templates";
DROP TYPE "V2NotificationDeliveryStatus";
