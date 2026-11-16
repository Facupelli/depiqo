BEGIN;

-- Block concurrent rental writes between validation and conversion. No rental
-- versions, timestamps, totals, relations, or delivery rows are rewritten.
LOCK TABLE "v2_rentals" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "rental_delivery_details"
  ALTER COLUMN "formatted_address" DROP NOT NULL,
  ALTER COLUMN "latitude" DROP NOT NULL,
  ALTER COLUMN "longitude" DROP NOT NULL,
  ADD CONSTRAINT "rental_delivery_details_coordinates_complete_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

-- Existing address/formatted-address nonempty checks and coordinate range
-- checks remain in place. PostgreSQL CHECK permits NULL for optional fields.
-- Migration-local helpers reject unsupported data instead of guessing defaults.
CREATE FUNCTION pg_temp.delivery_assert(valid BOOLEAN, detail TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF valid IS NOT TRUE THEN
    RAISE EXCEPTION '%', detail;
  END IF;
END $$;

CREATE FUNCTION pg_temp.delivery_object(value JSONB, required TEXT[], allowed TEXT[])
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.delivery_assert(jsonb_typeof(value) = 'object', 'expected an object');
  PERFORM pg_temp.delivery_assert(value ?& required, 'missing required object fields');
  PERFORM pg_temp.delivery_assert(value - allowed = '{}'::jsonb, 'unsupported object fields');
END $$;

CREATE FUNCTION pg_temp.delivery_text(value JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.delivery_assert(
    jsonb_typeof(value) = 'string' AND length(btrim(value #>> '{}')) > 0,
    'expected a nonempty string'
  );
END $$;

CREATE FUNCTION pg_temp.delivery_timestamp(value JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.delivery_text(value);
  -- Match the domain's UTC ISO timestamps, then let PostgreSQL check the date.
  PERFORM pg_temp.delivery_assert(
    (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?Z$',
    'expected a UTC ISO timestamp'
  );
  PERFORM (value #>> '{}')::timestamptz;
END $$;

CREATE FUNCTION pg_temp.delivery_decimal(value JSONB)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  amount NUMERIC;
BEGIN
  PERFORM pg_temp.delivery_assert(jsonb_typeof(value) = 'string', 'expected a decimal string');
  amount := (value #>> '{}')::numeric;
  PERFORM pg_temp.delivery_assert(
    amount >= 0 AND amount NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric),
    'expected a finite non-negative decimal'
  );
  RETURN amount;
END $$;

CREATE FUNCTION pg_temp.delivery_integer(value JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  number NUMERIC;
BEGIN
  PERFORM pg_temp.delivery_assert(jsonb_typeof(value) = 'number', 'expected an integer');
  number := (value #>> '{}')::numeric;
  PERFORM pg_temp.delivery_assert(
    number BETWEEN 0 AND 9007199254740991 AND number = trunc(number),
    'expected a non-negative safe integer'
  );
END $$;

DO $$
DECLARE
  rental RECORD;
  snapshot JSONB;
  leg JSONB;
  decision JSONB;
  destination JSONB;
  field TEXT;
  arrangement TEXT;
  has_quote BOOLEAN;
  calculated BOOLEAN;
  failure TEXT;
BEGIN
  -- Validate every non-SQL-NULL snapshot, including draft/cancelled rentals.
  -- JSON null, unknown schemas/versions, malformed fields, and unknown keys
  -- fail explicitly. Already-V2 snapshots are validated but never updated.
  FOR rental IN
    SELECT "id", "accepted_delivery_snapshot" AS snapshot
    FROM "v2_rentals"
    WHERE "accepted_delivery_snapshot" IS NOT NULL
    ORDER BY "id"
  LOOP
    BEGIN
      snapshot := rental.snapshot;
      PERFORM pg_temp.delivery_assert(jsonb_typeof(snapshot) = 'object', 'snapshot must be an object');
      PERFORM pg_temp.delivery_assert(
        snapshot -> 'schema' = '"v2.accepted-delivery"'::jsonb
          AND snapshot -> 'version' IN ('1'::jsonb, '2'::jsonb),
        'unsupported snapshot schema or version'
      );
      IF snapshot -> 'version' = '1'::jsonb THEN
        PERFORM pg_temp.delivery_assert(NOT snapshot ? 'arrangement', 'V1 must not contain arrangement');
        snapshot := snapshot || '{"version":2,"arrangement":"ROUTED"}'::jsonb;
      END IF;
      PERFORM pg_temp.delivery_assert(
        snapshot -> 'arrangement' IN ('"ROUTED"'::jsonb, '"STAFF_ARRANGED"'::jsonb),
        'unsupported V2 arrangement'
      );
      arrangement := snapshot ->> 'arrangement';
      IF arrangement = 'ROUTED' THEN
        PERFORM pg_temp.delivery_object(snapshot,
          ARRAY['schema', 'version', 'arrangement', 'distanceMeters', 'delivery', 'collection', 'currency', 'transportReservationMinutes'],
          ARRAY['schema', 'version', 'arrangement', 'distanceMeters', 'delivery', 'collection', 'currency', 'transportReservationMinutes', 'deliveryTotal', 'branchId', 'resolvedDestination', 'policyException', 'staffAgreement']);
        PERFORM pg_temp.delivery_integer(snapshot -> 'distanceMeters');
      ELSE
        PERFORM pg_temp.delivery_object(snapshot,
          ARRAY['schema', 'version', 'arrangement', 'delivery', 'collection', 'currency', 'transportReservationMinutes', 'staffAgreement'],
          ARRAY['schema', 'version', 'arrangement', 'delivery', 'collection', 'currency', 'transportReservationMinutes', 'staffAgreement']);
      END IF;
      PERFORM pg_temp.delivery_text(snapshot -> 'currency');
      PERFORM pg_temp.delivery_integer(snapshot -> 'transportReservationMinutes');
      has_quote := snapshot ? 'deliveryTotal';
      IF has_quote THEN
        PERFORM pg_temp.delivery_decimal(snapshot -> 'deliveryTotal');
      END IF;

      FOREACH field IN ARRAY ARRAY['delivery', 'collection'] LOOP
        leg := snapshot -> field;
        PERFORM pg_temp.delivery_object(leg, ARRAY['scheduledAt'],
          CASE WHEN arrangement = 'ROUTED'
            THEN ARRAY['scheduledAt', 'serviceLevel', 'basePrice', 'surcharge', 'total']
            ELSE ARRAY['scheduledAt'] END);
        PERFORM pg_temp.delivery_timestamp(leg -> 'scheduledAt');
        calculated := leg ?| ARRAY['serviceLevel', 'basePrice', 'surcharge', 'total'];
        PERFORM pg_temp.delivery_assert(calculated = has_quote, 'automatic quote must be complete or entirely absent');
        IF calculated THEN
          PERFORM pg_temp.delivery_assert(
            leg ?& ARRAY['serviceLevel', 'basePrice', 'surcharge', 'total']
              AND leg -> 'serviceLevel' IN ('"NORMAL"'::jsonb, '"SPECIAL"'::jsonb),
            'incomplete calculated leg terms or unsupported service level'
          );
          PERFORM pg_temp.delivery_assert(
            pg_temp.delivery_decimal(leg -> 'basePrice') + pg_temp.delivery_decimal(leg -> 'surcharge')
              = pg_temp.delivery_decimal(leg -> 'total'),
            'leg total must equal base price plus surcharge'
          );
        END IF;
      END LOOP;
      PERFORM pg_temp.delivery_assert(
        (snapshot #>> '{collection,scheduledAt}')::timestamptz > (snapshot #>> '{delivery,scheduledAt}')::timestamptz,
        'collection must be after delivery'
      );
      IF has_quote THEN
        PERFORM pg_temp.delivery_assert(
          pg_temp.delivery_decimal(snapshot #> '{delivery,total}') + pg_temp.delivery_decimal(snapshot #> '{collection,total}')
            = pg_temp.delivery_decimal(snapshot -> 'deliveryTotal'),
          'delivery total must equal both leg totals'
        );
      ELSIF arrangement = 'ROUTED' THEN
        PERFORM pg_temp.delivery_assert(snapshot ?& ARRAY['staffAgreement', 'policyException'],
          'routed delivery without an automatic quote requires agreement and policy exception');
      END IF;

      IF snapshot ? 'branchId' THEN
        PERFORM pg_temp.delivery_text(snapshot -> 'branchId');
      END IF;
      IF snapshot ? 'resolvedDestination' THEN
        destination := snapshot -> 'resolvedDestination';
        PERFORM pg_temp.delivery_object(destination,
          ARRAY['formattedAddress', 'latitude', 'longitude'],
          ARRAY['formattedAddress', 'latitude', 'longitude', 'providerPlaceId']);
        PERFORM pg_temp.delivery_text(destination -> 'formattedAddress');
        PERFORM pg_temp.delivery_assert(
          jsonb_typeof(destination -> 'latitude') = 'number'
            AND jsonb_typeof(destination -> 'longitude') = 'number',
          'destination coordinates must be numbers'
        );
        PERFORM pg_temp.delivery_assert(
          (destination ->> 'latitude')::numeric BETWEEN -90 AND 90
            AND (destination ->> 'longitude')::numeric BETWEEN -180 AND 180,
          'destination coordinates out of range'
        );
        IF destination ? 'providerPlaceId' THEN
          PERFORM pg_temp.delivery_text(destination -> 'providerPlaceId');
        END IF;
      END IF;
      IF snapshot ? 'staffAgreement' THEN
        decision := snapshot -> 'staffAgreement';
        PERFORM pg_temp.delivery_object(decision,
          ARRAY['amount', 'agreedBy', 'agreedAt'], ARRAY['amount', 'agreedBy', 'agreedAt', 'reason']);
        PERFORM pg_temp.delivery_decimal(decision -> 'amount');
        PERFORM pg_temp.delivery_text(decision -> 'agreedBy');
        PERFORM pg_temp.delivery_timestamp(decision -> 'agreedAt');
        IF decision ? 'reason' THEN
          PERFORM pg_temp.delivery_text(decision -> 'reason');
        END IF;
      END IF;
      IF snapshot ? 'policyException' THEN
        PERFORM pg_temp.delivery_assert(snapshot ?& ARRAY['branchId', 'resolvedDestination'],
          'policy exception requires branch and resolved destination');
        decision := snapshot -> 'policyException';
        PERFORM pg_temp.delivery_object(decision,
          ARRAY['overriddenRestrictions', 'authorizedBy', 'authorizedAt'],
          ARRAY['overriddenRestrictions', 'authorizedBy', 'authorizedAt', 'reason']);
        PERFORM pg_temp.delivery_text(decision -> 'authorizedBy');
        PERFORM pg_temp.delivery_timestamp(decision -> 'authorizedAt');
        IF decision ? 'reason' THEN
          PERFORM pg_temp.delivery_text(decision -> 'reason');
        END IF;
        PERFORM pg_temp.delivery_assert(jsonb_typeof(decision -> 'overriddenRestrictions') = 'array',
          'policy restrictions must be an array');
        PERFORM pg_temp.delivery_assert(
          jsonb_array_length(decision -> 'overriddenRestrictions') > 0
            AND NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(decision -> 'overriddenRestrictions') AS restriction(value)
              WHERE value NOT IN ('"NOT_CONFIGURED"'::jsonb, '"DISABLED"'::jsonb, '"BEYOND_MAX_DISTANCE"'::jsonb,
                '"DELIVERY_OUTSIDE_SERVICE_HOURS"'::jsonb, '"COLLECTION_OUTSIDE_SERVICE_HOURS"'::jsonb)
            )
            AND (SELECT count(DISTINCT value) FROM jsonb_array_elements(decision -> 'overriddenRestrictions'))
              = jsonb_array_length(decision -> 'overriddenRestrictions'),
          'policy restrictions must be supported, nonempty, and unique'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS failure = MESSAGE_TEXT;
      RAISE EXCEPTION USING
        MESSAGE = format('Cannot migrate accepted delivery snapshot for rental %s: %s', rental.id, failure),
        HINT = 'Audit the snapshot and resolve unsupported data before retrying. No rental data is deleted or defaulted by this migration.';
    END;
  END LOOP;
END $$;

-- JSONB merge changes only these two discriminators; all financial,
-- operational, destination, and attribution values remain exactly as stored.
UPDATE "v2_rentals"
SET "accepted_delivery_snapshot" = "accepted_delivery_snapshot" || '{"version":2,"arrangement":"ROUTED"}'::jsonb
WHERE "accepted_delivery_snapshot" -> 'version' = '1'::jsonb;

DROP FUNCTION pg_temp.delivery_integer(JSONB);
DROP FUNCTION pg_temp.delivery_decimal(JSONB);
DROP FUNCTION pg_temp.delivery_timestamp(JSONB);
DROP FUNCTION pg_temp.delivery_text(JSONB);
DROP FUNCTION pg_temp.delivery_object(JSONB, TEXT[], TEXT[]);
DROP FUNCTION pg_temp.delivery_assert(BOOLEAN, TEXT);

COMMIT;
