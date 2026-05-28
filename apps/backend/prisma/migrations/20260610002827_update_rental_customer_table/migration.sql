/*
  Warnings:

  - You are about to drop the `tenant_domains` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "V2TenantDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISABLED');

-- DropForeignKey
ALTER TABLE "tenant_domains" DROP CONSTRAINT "tenant_domains_tenant_id_fkey";

-- AlterTable
ALTER TABLE "v2_rental_customers" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "tenant_domains";

-- CreateTable
CREATE TABLE "v2_rental_customer_auth_identities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "V2AuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rental_customer_auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_tenant_domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "V2TenantDomainStatus" NOT NULL DEFAULT 'PENDING',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "v2_rental_customer_auth_identities_tenant_id_customer_id_idx" ON "v2_rental_customer_auth_identities"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "v2_rental_customer_auth_identities_tenant_id_email_idx" ON "v2_rental_customer_auth_identities"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_customer_auth_identities_tenant_id_provider_provi_key" ON "v2_rental_customer_auth_identities"("tenant_id", "provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_customer_auth_identities_customer_id_provider_key" ON "v2_rental_customer_auth_identities"("customer_id", "provider");

-- CreateIndex
CREATE INDEX "v2_tenant_domains_tenant_id_status_deleted_at_idx" ON "v2_tenant_domains"("tenant_id", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_domains_domain_key" ON "v2_tenant_domains"("domain");

-- AddForeignKey
ALTER TABLE "v2_rental_customer_auth_identities" ADD CONSTRAINT "v2_rental_customer_auth_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "v2_rental_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_tenant_domains" ADD CONSTRAINT "v2_tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
