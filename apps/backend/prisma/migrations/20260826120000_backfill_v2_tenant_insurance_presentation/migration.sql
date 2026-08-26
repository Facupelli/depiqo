UPDATE "v2_tenants"
SET "config" = jsonb_set(
  "config",
  '{pricing}',
  ("config"->'pricing') || jsonb_build_object(
    'insuranceLabel',
    CASE
      WHEN ("config"->'pricing') ? 'insuranceLabel'
        THEN "config"->'pricing'->'insuranceLabel'
      ELSE to_jsonb('Seguro de equipos'::text)
    END,
    'insuranceDescription',
    CASE
      WHEN ("config"->'pricing') ? 'insuranceDescription'
        THEN "config"->'pricing'->'insuranceDescription'
      ELSE to_jsonb($insurance_description$Protege tu pedido ante imprevistos durante el alquiler. El cargo se calcula sobre el subtotal antes de descuentos y se suma al total final.$insurance_description$::text)
    END
  ),
  true
)
WHERE jsonb_typeof("config") = 'object'
  AND jsonb_typeof("config"->'pricing') = 'object'
  AND (
    NOT (("config"->'pricing') ? 'insuranceLabel')
    OR NOT (("config"->'pricing') ? 'insuranceDescription')
  );
