-- CreateEnum
CREATE TYPE "V2TenantSystemRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "v2_tenant_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system_role" "V2TenantSystemRole",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "v2_tenant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_tenant_role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "v2_tenant_role_permissions_pkey" PRIMARY KEY ("role_id", "permission")
);

-- AlterTable
ALTER TABLE "v2_tenant_users"
ADD COLUMN "role_id" TEXT,
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_roles_tenant_id_name_key"
ON "v2_tenant_roles"("tenant_id", "name");

-- CreateIndex
-- PostgreSQL permits multiple NULL values, so this constrains only system roles.
CREATE UNIQUE INDEX "v2_tenant_roles_tenant_id_system_role_key"
ON "v2_tenant_roles"("tenant_id", "system_role");

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_roles_tenant_id_id_key"
ON "v2_tenant_roles"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "v2_tenant_users_role_id_idx" ON "v2_tenant_users"("role_id");

-- AddForeignKey
ALTER TABLE "v2_tenant_roles"
ADD CONSTRAINT "v2_tenant_roles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_tenant_role_permissions"
ADD CONSTRAINT "v2_tenant_role_permissions_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "v2_tenant_roles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_tenant_users"
ADD CONSTRAINT "v2_tenant_users_tenant_id_role_id_fkey"
FOREIGN KEY ("tenant_id", "role_id") REFERENCES "v2_tenant_roles"("tenant_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill one built-in Administrator and one custom Member role per existing tenant.
INSERT INTO "v2_tenant_roles" (
    "id",
    "tenant_id",
    "name",
    "system_role",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    tenant."id",
    'Administrador',
    'ADMIN'::"V2TenantSystemRole",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "v2_tenants" AS tenant
ORDER BY tenant."id";

INSERT INTO "v2_tenant_roles" (
    "id",
    "tenant_id",
    "name",
    "system_role",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    tenant."id",
    'Miembro',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "v2_tenants" AS tenant
ORDER BY tenant."id";

-- Preserve the legacy role and make the new relationship agree with it.
UPDATE "v2_tenant_users" AS tenant_user
SET "role_id" = tenant_role."id"
FROM "v2_tenant_roles" AS tenant_role
WHERE tenant_role."tenant_id" = tenant_user."tenant_id"
  AND (
      (tenant_user."role" = 'ADMIN'::"V2UserRole" AND tenant_role."system_role" = 'ADMIN'::"V2TenantSystemRole")
      OR
      (tenant_user."role" = 'USER'::"V2UserRole" AND tenant_role."name" = 'Miembro' AND tenant_role."system_role" IS NULL)
  );

-- Fail rather than silently completing if any existing user was not backfilled.
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
            'V2 tenant role backfill failed: % existing tenant user(s) have no role_id',
            users_without_role;
    END IF;
END $$;
