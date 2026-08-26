-- CreateTable
CREATE TABLE "v2_tenant_contract_signers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "signature_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_tenant_contract_signers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "v2_tenant_contract_signers_tenant_id_is_active_deleted_at_idx" ON "v2_tenant_contract_signers"("tenant_id", "is_active", "deleted_at");

-- AddForeignKey
ALTER TABLE "v2_tenant_contract_signers" ADD CONSTRAINT "v2_tenant_contract_signers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
