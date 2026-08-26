-- CreateTable
CREATE TABLE "v2_tenant_branding" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT,
    "accent_color" TEXT,
    "storefront_name" TEXT,
    "tagline" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_tenant_branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_branding_tenant_id_key" ON "v2_tenant_branding"("tenant_id");

-- AddForeignKey
ALTER TABLE "v2_tenant_branding" ADD CONSTRAINT "v2_tenant_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
