/*
  Warnings:

  - Added the required column `unsigned_artifact_id` to the `v2_document_signing_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "v2_document_signing_requests" ADD COLUMN     "unsigned_artifact_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "v2_document_signing_requests_unsigned_artifact_id_idx" ON "v2_document_signing_requests"("unsigned_artifact_id");

-- AddForeignKey
ALTER TABLE "v2_document_signing_requests" ADD CONSTRAINT "v2_document_signing_requests_unsigned_artifact_id_fkey" FOREIGN KEY ("unsigned_artifact_id") REFERENCES "v2_contract_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
