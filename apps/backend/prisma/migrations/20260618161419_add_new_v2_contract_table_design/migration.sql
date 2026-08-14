/*
  Warnings:

  - You are about to drop the column `document_key` on the `v2_contracts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenant_id,document_number]` on the table `v2_contracts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token_hash]` on the table `v2_document_signing_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "V2ContractArtifactKind" AS ENUM ('UNSIGNED_PDF', 'SIGNED_PDF');

-- CreateEnum
CREATE TYPE "V2ContractArtifactVisibility" AS ENUM ('INTERNAL', 'PUBLIC');

-- AlterEnum
ALTER TYPE "V2DocumentSigningRequestStatus" ADD VALUE 'VIEWED';

-- AlterTable
ALTER TABLE "v2_contracts" DROP COLUMN "document_key",
ADD COLUMN     "document_number" TEXT,
ADD COLUMN     "generated_at" TIMESTAMP(3),
ADD COLUMN     "signed_at" TIMESTAMP(3),
ADD COLUMN     "voided_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "v2_document_signing_requests" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "token_hash" TEXT,
ADD COLUMN     "viewed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "v2_contract_artifacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "kind" "V2ContractArtifactKind" NOT NULL,
    "visibility" "V2ContractArtifactVisibility" NOT NULL DEFAULT 'INTERNAL',
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "hash_algorithm" TEXT,
    "document_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_contract_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_document_signature_acceptances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "signing_request_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT,
    "signer_phone" TEXT,
    "signature_image_data_url" TEXT,
    "signature_storage_key" TEXT,
    "signature_content_type" TEXT,
    "signature_byte_size" INTEGER,
    "acceptance_text_version" TEXT NOT NULL,
    "acceptance_text_snapshot" TEXT NOT NULL,
    "unsigned_artifact_id" TEXT NOT NULL,
    "signed_artifact_id" TEXT,
    "unsigned_document_hash" TEXT NOT NULL,
    "signed_document_hash" TEXT,
    "hash_algorithm" TEXT NOT NULL DEFAULT 'SHA-256',
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "accepted_ip_address" TEXT,
    "accepted_user_agent" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_document_signature_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "v2_contract_artifacts_tenant_id_contract_id_kind_idx" ON "v2_contract_artifacts"("tenant_id", "contract_id", "kind");

-- CreateIndex
CREATE INDEX "v2_contract_artifacts_tenant_id_contract_id_kind_visibility_idx" ON "v2_contract_artifacts"("tenant_id", "contract_id", "kind", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "v2_document_signature_acceptances_signing_request_id_key" ON "v2_document_signature_acceptances"("signing_request_id");

-- CreateIndex
CREATE INDEX "v2_document_signature_acceptances_tenant_id_contract_id_idx" ON "v2_document_signature_acceptances"("tenant_id", "contract_id");

-- CreateIndex
CREATE INDEX "v2_document_signature_acceptances_tenant_id_accepted_at_idx" ON "v2_document_signature_acceptances"("tenant_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "v2_contracts_tenant_id_document_number_key" ON "v2_contracts"("tenant_id", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "v2_document_signing_requests_token_hash_key" ON "v2_document_signing_requests"("token_hash");

-- CreateIndex
CREATE INDEX "v2_document_signing_requests_tenant_id_contract_id_status_idx" ON "v2_document_signing_requests"("tenant_id", "contract_id", "status");

-- AddForeignKey
ALTER TABLE "v2_contract_artifacts" ADD CONSTRAINT "v2_contract_artifacts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "v2_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_document_signature_acceptances" ADD CONSTRAINT "v2_document_signature_acceptances_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "v2_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_document_signature_acceptances" ADD CONSTRAINT "v2_document_signature_acceptances_signing_request_id_fkey" FOREIGN KEY ("signing_request_id") REFERENCES "v2_document_signing_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_document_signature_acceptances" ADD CONSTRAINT "v2_document_signature_acceptances_unsigned_artifact_id_fkey" FOREIGN KEY ("unsigned_artifact_id") REFERENCES "v2_contract_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_document_signature_acceptances" ADD CONSTRAINT "v2_document_signature_acceptances_signed_artifact_id_fkey" FOREIGN KEY ("signed_artifact_id") REFERENCES "v2_contract_artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
