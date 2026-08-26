ALTER TABLE "auth_handoff_tokens"
  ADD COLUMN "canonical_host" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "redirect_path" TEXT NOT NULL DEFAULT '/';

ALTER TABLE "auth_handoff_tokens"
  ALTER COLUMN "canonical_host" DROP DEFAULT,
  ALTER COLUMN "redirect_path" DROP DEFAULT;

CREATE TABLE "customer_google_oauth_transactions" (
  "id" TEXT NOT NULL,
  "state_hash" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "canonical_host" TEXT NOT NULL,
  "redirect_path" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "used_at" TIMESTAMP(3),
  CONSTRAINT "customer_google_oauth_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_google_oauth_transactions_state_hash_key"
  ON "customer_google_oauth_transactions"("state_hash");
CREATE INDEX "customer_google_oauth_transactions_tenant_id_idx"
  ON "customer_google_oauth_transactions"("tenant_id");
