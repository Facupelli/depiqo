ALTER TABLE "v2_rentals" ADD COLUMN "draft_creation_operation_id" TEXT;
ALTER TABLE "v2_rentals" ADD COLUMN "draft_creation_fingerprint" TEXT;

CREATE UNIQUE INDEX "v2_rentals_tenant_id_draft_creation_operation_id_key"
ON "v2_rentals"("tenant_id", "draft_creation_operation_id");
