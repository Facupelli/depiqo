ALTER TABLE "auth_handoff_tokens"
  ADD COLUMN "return_host" TEXT;

ALTER TABLE "customer_google_oauth_transactions"
  ADD COLUMN "return_host" TEXT;
