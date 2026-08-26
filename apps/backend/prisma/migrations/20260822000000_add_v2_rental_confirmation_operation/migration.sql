-- AlterTable
ALTER TABLE "v2_rentals" ADD COLUMN "confirmation_operation_id" TEXT;
ALTER TABLE "v2_rentals" ADD COLUMN "confirmation_fingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "v2_rentals_tenant_id_confirmation_operation_id_key" ON "v2_rentals"("tenant_id", "confirmation_operation_id");
