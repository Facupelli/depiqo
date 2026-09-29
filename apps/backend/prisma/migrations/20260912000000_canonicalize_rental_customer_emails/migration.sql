BEGIN;

-- Merge the confirmed duplicate in both legacy and current customer tables. An
-- empty database has nothing to merge; a partially matching database must not
-- silently discard either identity or its associations.
DO $$
DECLARE
  source_id CONSTANT text := '8f21b472-c211-435e-bae4-9be0be2f851c';
  survivor_id CONSTANT text := '5bab28e0-3c54-43ac-8eb1-e68e34fa24f2';
  matched_rows integer;
BEGIN
  SELECT count(*) INTO matched_rows
  FROM (
    SELECT id FROM customers WHERE id IN (source_id, survivor_id)
    UNION ALL
    SELECT id FROM v2_rental_customers WHERE id IN (source_id, survivor_id)
  ) AS accounts;

  IF matched_rows = 0 THEN
    RETURN;
  END IF;

  IF matched_rows <> 4 OR NOT EXISTS (
    SELECT 1
    FROM customers source
    JOIN customers survivor ON survivor.id = survivor_id
    JOIN v2_rental_customers current_source ON current_source.id = source.id
    JOIN v2_rental_customers current_survivor ON current_survivor.id = survivor.id
    JOIN v2_customer_profiles profile ON profile.customer_id = survivor.id
    JOIN customer_profiles legacy_profile ON legacy_profile.customer_id = survivor.id
    WHERE source.id = source_id
      AND source.tenant_id = survivor.tenant_id
      AND current_source.tenant_id = source.tenant_id
      AND current_survivor.tenant_id = source.tenant_id
      AND source.email = 'Hellomunkhtulga@gmail.com'
      AND current_source.email = source.email
      AND survivor.email = 'hellomunkhtulga@gmail.com'
      AND current_survivor.email = survivor.email
      AND current_survivor.onboarding_status = 'APPROVED'
      AND NOT EXISTS (SELECT 1 FROM customer_profiles WHERE customer_id = source_id)
      AND NOT EXISTS (SELECT 1 FROM v2_customer_profiles WHERE customer_id = source_id)
  ) THEN
    RAISE EXCEPTION 'Customer email merge preconditions failed; inspect both accounts before migrating';
  END IF;

  -- Legacy associations (including references without a database foreign key).
  UPDATE orders SET customer_id = survivor_id WHERE customer_id = source_id;
  UPDATE order_create_idempotency_keys SET customer_id = survivor_id WHERE customer_id = source_id;
  UPDATE coupons SET restricted_to_customer_id = survivor_id WHERE restricted_to_customer_id = source_id;
  UPDATE coupon_redemptions SET customer_id = survivor_id WHERE customer_id = source_id;
  UPDATE external_identities SET customer_id = survivor_id WHERE customer_id = source_id;

  -- Current rentals and pricing references do not all have foreign keys.
  UPDATE v2_rentals SET customer_id = survivor_id WHERE customer_id = source_id;
  UPDATE v2_coupons SET restricted_to_customer_id = survivor_id WHERE restricted_to_customer_id = source_id;
  UPDATE v2_coupon_redemptions SET customer_id = survivor_id WHERE customer_id = source_id;
  UPDATE v2_rental_customer_auth_identities SET customer_id = survivor_id WHERE customer_id = source_id;

  DELETE FROM v2_rental_customers WHERE id = source_id;
  DELETE FROM customers WHERE id = source_id;
END $$;

-- Canonicalize every remaining customer, not just the merged pair. Fail and
-- roll back if any other case-insensitive collision exists in a deployment.
UPDATE customers SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));
UPDATE v2_rental_customers SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));

-- Canonical values plus the existing Prisma compound unique indexes enforce
-- case-insensitive tenant-scoped uniqueness, including for direct database writes.
ALTER TABLE customers ADD CONSTRAINT customers_email_canonical_check
  CHECK (email = lower(btrim(email)));
ALTER TABLE v2_rental_customers ADD CONSTRAINT v2_rental_customers_email_canonical_check
  CHECK (email = lower(btrim(email)));

COMMIT;
