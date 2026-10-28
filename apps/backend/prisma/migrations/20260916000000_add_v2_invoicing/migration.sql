-- CreateEnum
CREATE TYPE "V2InvoiceOrigin" AS ENUM ('EXTERNAL');

-- CreateEnum
CREATE TYPE "V2InvoiceHistoryAction" AS ENUM ('REGISTERED', 'CORRECTED', 'REMOVED');

-- CreateTable
CREATE TABLE "v2_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "origin" "V2InvoiceOrigin" NOT NULL DEFAULT 'EXTERNAL',
    "reference" TEXT NOT NULL,
    "issued_on" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "external_url" TEXT,
    "source_system" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_tenant_user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_tenant_user_id" TEXT NOT NULL,
    "removed_at" TIMESTAMPTZ(3),
    "removed_by_tenant_user_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "v2_invoices_pkey" PRIMARY KEY ("id"),
    -- PostgreSQL numeric NaN compares greater than finite numbers, including zero.
    CONSTRAINT "v2_invoices_amount_check" CHECK ("amount" > 0 AND "amount" <> 'NaN'::numeric),
    CONSTRAINT "v2_invoices_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "v2_invoices_version_check" CHECK ("version" >= 0),
    CONSTRAINT "v2_invoices_removal_metadata_check" CHECK (
        ("removed_at" IS NULL) = ("removed_by_tenant_user_id" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "v2_invoice_history_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" "V2InvoiceHistoryAction" NOT NULL,
    "actor_tenant_user_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "v2_invoice_history_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "v2_invoice_history_entries_version_check" CHECK ("version" >= 0)
);

-- CreateIndex
CREATE INDEX "v2_invoices_tenant_id_rental_id_created_at_idx" ON "v2_invoices"("tenant_id", "rental_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "v2_invoices_id_tenant_id_key" ON "v2_invoices"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_invoice_history_entries_invoice_id_version_key" ON "v2_invoice_history_entries"("invoice_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rentals_id_tenant_id_key" ON "v2_rentals"("id", "tenant_id");

-- AddForeignKey
ALTER TABLE "v2_invoices" ADD CONSTRAINT "v2_invoices_rental_id_tenant_id_fkey" FOREIGN KEY ("rental_id", "tenant_id") REFERENCES "v2_rentals"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "v2_invoice_history_entries" ADD CONSTRAINT "v2_invoice_history_entries_invoice_id_tenant_id_fkey" FOREIGN KEY ("invoice_id", "tenant_id") REFERENCES "v2_invoices"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
