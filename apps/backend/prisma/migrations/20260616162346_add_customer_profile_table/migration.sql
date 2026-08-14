-- CreateTable
CREATE TABLE "v2_customer_profiles" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "document_number" TEXT NOT NULL,
    "identity_document_path" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state_region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "company" TEXT,
    "tax_id" TEXT,
    "business_name" TEXT,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "instagram" TEXT,
    "knows_existing_customer" BOOLEAN NOT NULL DEFAULT false,
    "known_customer_name" TEXT,
    "contact1_name" TEXT NOT NULL,
    "contact1_phone" TEXT NOT NULL DEFAULT 'migration',
    "contact1_relationship" TEXT NOT NULL,
    "contact2_name" TEXT NOT NULL,
    "contact2_phone" TEXT NOT NULL DEFAULT 'migration',
    "contact2_relationship" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_customer_profiles_customer_id_key" ON "v2_customer_profiles"("customer_id");

-- AddForeignKey
ALTER TABLE "v2_customer_profiles" ADD CONSTRAINT "v2_customer_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "v2_rental_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
