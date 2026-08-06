ALTER TABLE "v2_assets"
ADD COLUMN "serial_number_normalized" TEXT
GENERATED ALWAYS AS (LOWER(BTRIM("serial_number"))) STORED;

CREATE UNIQUE INDEX "v2_assets_tenant_active_serial_key"
ON "v2_assets" ("tenant_id", "serial_number_normalized")
WHERE "deleted_at" IS NULL
  AND "status" IN ('ACTIVE'::"V2AssetStatus", 'INACTIVE'::"V2AssetStatus")
  AND "serial_number_normalized" IS NOT NULL;
