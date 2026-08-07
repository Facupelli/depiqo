-- CreateEnum
CREATE TYPE "V2NotificationChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "V2NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "v2_assigned_assets" RENAME CONSTRAINT "v2_assigned_asset_references_pkey" TO "v2_assigned_assets_pkey";

-- CreateTable
CREATE TABLE "v2_notification_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "V2NotificationChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "version" INTEGER NOT NULL DEFAULT 1,
    "subject_template" TEXT,
    "body_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "template_id" TEXT,
    "template_key" TEXT,
    "template_version" INTEGER,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "source_context" TEXT,
    "source_aggregate_id" TEXT,
    "source_event_id" TEXT,
    "deduplication_key" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notification_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "channel" "V2NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "V2NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "provider_message_id" TEXT,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "v2_notification_templates_tenant_id_key_channel_is_active_idx" ON "v2_notification_templates"("tenant_id", "key", "channel", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "v2_notification_templates_tenant_id_key_channel_locale_vers_key" ON "v2_notification_templates"("tenant_id", "key", "channel", "locale", "version");

-- CreateIndex
CREATE INDEX "v2_notifications_tenant_id_created_at_idx" ON "v2_notifications"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "v2_notifications_tenant_id_source_aggregate_id_idx" ON "v2_notifications"("tenant_id", "source_aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_notifications_tenant_id_deduplication_key_key" ON "v2_notifications"("tenant_id", "deduplication_key");

-- CreateIndex
CREATE INDEX "v2_notification_deliveries_tenant_id_status_idx" ON "v2_notification_deliveries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "v2_notification_deliveries_notification_id_idx" ON "v2_notification_deliveries"("notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_notification_deliveries_notification_id_channel_recipien_key" ON "v2_notification_deliveries"("notification_id", "channel", "recipient");

-- RenameForeignKey
ALTER TABLE "v2_assigned_assets" RENAME CONSTRAINT "v2_assigned_asset_references_rental_demand_line_id_fkey" TO "v2_assigned_assets_rental_demand_line_id_fkey";

-- RenameForeignKey
ALTER TABLE "v2_assigned_assets" RENAME CONSTRAINT "v2_assigned_asset_references_rental_id_fkey" TO "v2_assigned_assets_rental_id_fkey";

-- AddForeignKey
ALTER TABLE "v2_notifications" ADD CONSTRAINT "v2_notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "v2_notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_notification_deliveries" ADD CONSTRAINT "v2_notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "v2_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "v2_assigned_asset_references_asset_id_idx" RENAME TO "v2_assigned_assets_asset_id_idx";

-- RenameIndex
ALTER INDEX "v2_assigned_asset_references_rental_demand_line_id_asset_id_key" RENAME TO "v2_assigned_assets_rental_demand_line_id_asset_id_key";

-- RenameIndex
ALTER INDEX "v2_assigned_asset_references_tenant_id_rental_id_idx" RENAME TO "v2_assigned_assets_tenant_id_rental_id_idx";
