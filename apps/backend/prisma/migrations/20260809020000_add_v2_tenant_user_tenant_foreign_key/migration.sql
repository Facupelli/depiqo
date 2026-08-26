DO $$
DECLARE
    orphaned_tenant_count INTEGER;
    orphaned_tenant_ids TEXT;
BEGIN
    SELECT COUNT(*), STRING_AGG("tenant_id", ', ' ORDER BY "tenant_id")
    INTO orphaned_tenant_count, orphaned_tenant_ids
    FROM (
        SELECT DISTINCT tenant_user."tenant_id"
        FROM "v2_tenant_users" AS tenant_user
        LEFT JOIN "v2_tenants" AS tenant
            ON tenant."id" = tenant_user."tenant_id"
        WHERE tenant."id" IS NULL
    ) AS orphaned_tenants;

    IF orphaned_tenant_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add v2_tenant_users tenant foreign key: found % orphaned tenant ID(s): %',
            orphaned_tenant_count,
            orphaned_tenant_ids;
    END IF;
END $$;

ALTER TABLE "v2_tenant_users"
ADD CONSTRAINT "v2_tenant_users_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
