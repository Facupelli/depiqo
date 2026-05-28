/*
  Warnings:

  - A unique constraint covering the columns `[cf_hostname_id]` on the table `v2_tenant_domains` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "v2_tenant_domains" ADD COLUMN     "cf_hostname_id" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "last_checked_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_domains_cf_hostname_id_key" ON "v2_tenant_domains"("cf_hostname_id");
