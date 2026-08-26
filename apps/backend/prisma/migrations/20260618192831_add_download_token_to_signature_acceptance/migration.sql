/*
  Warnings:

  - A unique constraint covering the columns `[receipt_token_hash]` on the table `v2_document_signature_acceptances` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "v2_document_signature_acceptances" ADD COLUMN     "receipt_downloaded_at" TIMESTAMP(3),
ADD COLUMN     "receipt_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "receipt_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "v2_document_signature_acceptances_receipt_token_hash_key" ON "v2_document_signature_acceptances"("receipt_token_hash");
