-- Keep notification types as stable strings. The application validates values for new writes,
-- while persistence remains forward-compatible with notification types introduced by other versions.

-- Notification correlation and idempotency.
ALTER TABLE "v2_notifications"
  ADD COLUMN "source_aggregate_type" TEXT,
  ADD COLUMN "content_hash" TEXT;

ALTER TABLE "v2_notifications"
  RENAME COLUMN "deduplication_key" TO "idempotency_key";

ALTER INDEX "v2_notifications_tenant_id_deduplication_key_key"
  RENAME TO "v2_notifications_tenant_id_idempotency_key_key";

-- Delivery outcome and diagnostic fields. Provider results must be normalized and must not
-- contain message bodies, bearer tokens, signed URLs, or raw provider request/response payloads.
ALTER TABLE "v2_notification_deliveries"
  RENAME COLUMN "last_error" TO "last_error_message";

ALTER TABLE "v2_notification_deliveries"
  ADD COLUMN "provider_result" JSONB,
  ADD COLUMN "last_error_code" TEXT,
  ADD COLUMN "last_attempt_at" TIMESTAMP(3);
