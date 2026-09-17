-- Refuse to infer or assign authorization roles for invalid persisted users.
DO $$
DECLARE
    users_without_role INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO users_without_role
    FROM "v2_tenant_users"
    WHERE "role_id" IS NULL;

    IF users_without_role > 0 THEN
        RAISE EXCEPTION
            'Cannot require V2 tenant user roles: % tenant user(s) have no role_id',
            users_without_role;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "v2_tenant_users"
ALTER COLUMN "role_id" SET NOT NULL;
