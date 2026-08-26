-- V2 promotion and coupon validity is a local calendar DATE, not an absolute instant.
-- The source columns are TIMESTAMP WITHOUT TIME ZONE. ::date extracts their stored
-- wall-clock date and never consults the PostgreSQL session timezone.
--
-- Production preflight, before deploying this migration:
-- SELECT 'v2_promotions' AS table_name, id, valid_from, valid_until
-- FROM v2_promotions
-- WHERE (valid_from IS NOT NULL AND valid_from::time <> TIME '00:00:00')
--    OR (valid_until IS NOT NULL AND valid_until::time <> TIME '00:00:00')
-- UNION ALL
-- SELECT 'v2_coupons' AS table_name, id, valid_from, valid_until
-- FROM v2_coupons
-- WHERE (valid_from IS NOT NULL AND valid_from::time <> TIME '00:00:00')
--    OR (valid_until IS NOT NULL AND valid_until::time <> TIME '00:00:00');

ALTER TABLE "v2_promotions"
  ALTER COLUMN "valid_from" TYPE DATE USING "valid_from"::date,
  ALTER COLUMN "valid_until" TYPE DATE USING "valid_until"::date;

ALTER TABLE "v2_coupons"
  ALTER COLUMN "valid_from" TYPE DATE USING "valid_from"::date,
  ALTER COLUMN "valid_until" TYPE DATE USING "valid_until"::date;
