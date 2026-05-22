BEGIN;

UPDATE "tenants"
SET "config" =
  CASE
    WHEN "config" IS NULL THEN
      '{
        "pricing": {
          "overRentalEnabled": false,
          "maxOverRentThreshold": 0,
          "weekendCountsAsOne": false,
          "roundingRule": "IGNORE_PARTIAL_DAY",
          "currency": "ARS",
          "locale": "es-AR",
          "insuranceEnabled": false,
          "insuranceRatePercent": 0
        },
        "notifications": {
          "enabledChannels": ["EMAIL"]
        },
        "timezone": "UTC",
        "newArrivalsWindowDays": 30,
        "bookingMode": "instant-book",
        "communication": {
          "orderCommunicationMode": "FORMAL",
          "whatsAppNumber": "34680870274",
          "showFloatingWhatsAppButton": false
        }
      }'::jsonb
    ELSE
      jsonb_set(
        "config",
        '{communication}',
        '{
          "orderCommunicationMode": "FORMAL",
          "whatsAppNumber": "34680870274",
          "showFloatingWhatsAppButton": false
        }'::jsonb || COALESCE("config"->'communication', '{}'::jsonb),
        true
      )
  END
WHERE "deleted_at" IS NULL;

COMMIT;
