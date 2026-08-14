-- DropForeignKey
ALTER TABLE "document_signing_requests" DROP CONSTRAINT "document_signing_requests_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_signing_requests" DROP CONSTRAINT "document_signing_requests_order_id_fkey";

-- DropForeignKey
ALTER TABLE "document_signing_requests" DROP CONSTRAINT "document_signing_requests_customer_id_fkey";

-- DropTable
DROP TABLE "document_signing_requests";

-- DropEnum
DROP TYPE "SigningDocumentType";

-- DropEnum
DROP TYPE "DocumentSigningRequestStatus";
