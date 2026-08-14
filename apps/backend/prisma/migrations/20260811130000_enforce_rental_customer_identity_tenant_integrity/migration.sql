DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "v2_rental_customer_auth_identities" AS identity
    INNER JOIN "v2_rental_customers" AS customer
      ON customer."id" = identity."customer_id"
    WHERE identity."tenant_id" <> customer."tenant_id"
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce rental customer identity tenant integrity: mismatched tenant/customer identity rows exist.';
  END IF;
END $$;

-- A composite referenced key is required for the tenant-scoped customer relation.
CREATE UNIQUE INDEX "v2_rental_customers_id_tenant_id_key"
  ON "v2_rental_customers"("id", "tenant_id");

ALTER TABLE "v2_rental_customer_auth_identities"
  DROP CONSTRAINT "v2_rental_customer_auth_identities_customer_id_fkey";

ALTER TABLE "v2_rental_customer_auth_identities"
  ADD CONSTRAINT "v2_rental_customer_auth_identities_customer_id_tenant_id_fkey"
  FOREIGN KEY ("customer_id", "tenant_id")
  REFERENCES "v2_rental_customers"("id", "tenant_id")
  ON DELETE CASCADE
  ON UPDATE RESTRICT;
