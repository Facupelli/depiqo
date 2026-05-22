-- This is an empty migration.
-- Migrate includedItems JSON to ACCESSORY product types and AccessoryLinks
DO $$
DECLARE
    pt RECORD;
    included_item JSONB;
    normalized_name TEXT;
    accessory_id UUID;
BEGIN
    FOR pt IN
        SELECT id, tenant_id, billing_unit_id, included_items
        FROM "product_types"
        WHERE "kind" = 'PRIMARY'
          AND "deleted_at" IS NULL
          AND "included_items" IS NOT NULL
          AND jsonb_array_length("included_items"::jsonb) > 0
    LOOP
        FOR included_item IN SELECT * FROM jsonb_array_elements(pt.included_items::jsonb)
        LOOP
            -- Skip malformed entries
            IF included_item->>'name' IS NULL OR TRIM(included_item->>'name') = '' THEN
                CONTINUE;
            END IF;

            normalized_name := LOWER(TRIM(included_item->>'name'));

            -- Find or reuse existing accessory for this tenant
            SELECT "id" INTO accessory_id
            FROM "product_types"
            WHERE "tenant_id" = pt.tenant_id
              AND "kind" = 'ACCESSORY'
              AND LOWER(TRIM("name")) = normalized_name
              AND "deleted_at" IS NULL
            LIMIT 1;

            -- Create accessory if not found
            IF accessory_id IS NULL THEN
                accessory_id := gen_random_uuid();
                INSERT INTO "product_types" (
                    "id", "tenant_id", "category_id", "billing_unit_id",
                    "name", "description", "image_url", "kind",
                    "tracking_mode", "exclude_from_new_arrivals",
                    "attributes", "included_items",
                    "created_at", "updated_at", "deleted_at", "published_at", "retired_at"
                ) VALUES (
                    accessory_id,
                    pt.tenant_id,
                    NULL,
                    pt.billing_unit_id,
                    TRIM(included_item->>'name'),
                    NULL,
                    'e545d3d3-c6bb-43fb-afa6-cdf734cbdf0a/catalog/accessories_placeholder.webp',
                    'ACCESSORY',
                    'POOLED',
                    false,
                    '{}',
                    '[]',
                    NOW(), NOW(), NULL, NULL, NULL
                );
            END IF;

            -- Link accessory to primary (idempotent via ON CONFLICT)
            INSERT INTO "accessory_links" (
                "id", "tenant_id", "primary_rental_item_id", "accessory_rental_item_id",
                "is_default_included", "default_quantity", "notes", "created_at", "updated_at"
            ) VALUES (
                gen_random_uuid(),
                pt.tenant_id,
                pt.id,
                accessory_id,
                true,
                COALESCE((included_item->>'quantity')::int, 1),
                included_item->>'notes',
                NOW(), NOW()
            )
            ON CONFLICT ("tenant_id", "primary_rental_item_id", "accessory_rental_item_id") DO NOTHING;

        END LOOP;
    END LOOP;
END $$;
