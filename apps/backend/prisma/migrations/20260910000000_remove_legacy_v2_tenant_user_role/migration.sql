-- DropIndex
DROP INDEX "v2_tenant_users_role_idx";

-- AlterTable
ALTER TABLE "v2_tenant_users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "V2UserRole";
