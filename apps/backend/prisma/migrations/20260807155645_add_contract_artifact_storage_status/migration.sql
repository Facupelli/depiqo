-- CreateEnum
CREATE TYPE "V2ContractArtifactStorageStatus" AS ENUM ('PENDING_UPLOAD', 'AVAILABLE', 'UPLOAD_FAILED');

-- AlterTable
ALTER TABLE "v2_contract_artifacts"
  ADD COLUMN "storage_status" "V2ContractArtifactStorageStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  ALTER COLUMN "hash_algorithm" SET NOT NULL,
  ALTER COLUMN "document_hash" SET NOT NULL;
