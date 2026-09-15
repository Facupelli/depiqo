-- This explicit list must remain synchronized with
-- DEFAULT_MEMBER_TENANT_PERMISSIONS in tenant-permission.registry.ts.

-- Fail clearly if Task 1 did not create exactly one Miembro role for each
-- existing tenant. The unique tenant/name constraint prevents duplicates, but
-- checking the count also documents the migration prerequisite.
DO $$
DECLARE
    tenants_without_member INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO tenants_without_member
    FROM "v2_tenants" AS tenant
    WHERE NOT EXISTS (
        SELECT 1
        FROM "v2_tenant_roles" AS tenant_role
        WHERE tenant_role."tenant_id" = tenant."id"
          AND tenant_role."name" = 'Miembro'
          AND tenant_role."system_role" IS NULL
    );

    IF tenants_without_member > 0 THEN
        RAISE EXCEPTION
            'Default Member permission backfill failed: % existing tenant(s) have no Miembro role',
            tenants_without_member;
    END IF;
END $$;

WITH default_member_permission(permission) AS (
    VALUES
        ('rentals.read'),
        ('rentals.proposals.manage'),
        ('rentals.confirm'),
        ('rentals.confirmed.manage'),
        ('rentals.fulfillment.manage'),
        ('rentals.cancel'),
        ('rentals.price_adjustment.manage'),
        ('contracts.read'),
        ('contracts.generate'),
        ('contracts.signing.send'),
        ('products.read'),
        ('products.manage'),
        ('products.availability.manage'),
        ('inventory.read'),
        ('inventory.manage'),
        ('inventory.ownership.manage'),
        ('pricing.read'),
        ('pricing.manage'),
        ('customers.read'),
        ('customers.onboarding.manage'),
        ('branches.manage'),
        ('tenant.settings.manage'),
        ('tenant.storefront.manage'),
        ('tenant.contract_signer.manage')
)
INSERT INTO "v2_tenant_role_permissions" ("role_id", "permission")
SELECT tenant_role."id", default_member_permission.permission
FROM "v2_tenant_roles" AS tenant_role
CROSS JOIN default_member_permission
WHERE tenant_role."name" = 'Miembro'
  AND tenant_role."system_role" IS NULL;
