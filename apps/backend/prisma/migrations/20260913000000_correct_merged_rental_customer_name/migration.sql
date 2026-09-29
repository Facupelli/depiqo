BEGIN;

-- The approved profile already has the correct full name. Correct only the
-- surviving customer's name fields in both the legacy and current tables.
DO $$
DECLARE
  survivor_id CONSTANT text := '5bab28e0-3c54-43ac-8eb1-e68e34fa24f2';
  matched_rows integer;
BEGIN
  SELECT count(*) INTO matched_rows
  FROM (
    SELECT id FROM customers WHERE id = survivor_id
    UNION ALL
    SELECT id FROM v2_rental_customers WHERE id = survivor_id
  ) AS accounts;

  IF matched_rows = 0 THEN
    RETURN;
  END IF;

  IF matched_rows <> 2 OR NOT EXISTS (
    SELECT 1
    FROM customers legacy
    JOIN v2_rental_customers current_customer ON current_customer.id = legacy.id
    WHERE legacy.id = survivor_id
      AND legacy.tenant_id = current_customer.tenant_id
      AND legacy.email = 'hellomunkhtulga@gmail.com'
      AND current_customer.email = legacy.email
      AND (legacy.first_name, legacy.last_name) IN (
        ('J.Munkhtulga', 'User'), ('Munkhtulga', 'Jargalsaikhan')
      )
      AND (current_customer.first_name, current_customer.last_name) IN (
        ('J.Munkhtulga', 'User'), ('Munkhtulga', 'Jargalsaikhan')
      )
  ) THEN
    RAISE EXCEPTION 'Merged customer name correction preconditions failed; inspect both accounts before migrating';
  END IF;

  UPDATE customers
  SET first_name = 'Munkhtulga', last_name = 'Jargalsaikhan'
  WHERE id = survivor_id;

  UPDATE v2_rental_customers
  SET first_name = 'Munkhtulga', last_name = 'Jargalsaikhan'
  WHERE id = survivor_id;
END $$;

COMMIT;
