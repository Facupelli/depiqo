-- CreateIndex
CREATE UNIQUE INDEX "v2_branches_id_tenant_id_key" ON "v2_branches"("id", "tenant_id");

-- CreateTable
CREATE TABLE "v2_branch_delivery_configurations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL,
    "maximum_distance_meters" INTEGER NOT NULL,
    "eligible_weekdays" INTEGER[] NOT NULL,
    "eligibility_start_minute" INTEGER NOT NULL,
    "eligibility_end_minute" INTEGER NOT NULL,
    "normal_service_start_minute" INTEGER NOT NULL,
    "normal_service_end_minute" INTEGER NOT NULL,
    "special_hours_surcharge" DECIMAL(65,30) NOT NULL,
    "transport_reservation_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "v2_branch_delivery_configurations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "v2_branch_delivery_configurations_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "v2_branch_delivery_configurations_maximum_distance_check" CHECK ("maximum_distance_meters" > 0),
    CONSTRAINT "v2_branch_delivery_configurations_eligible_weekdays_check" CHECK (
      cardinality("eligible_weekdays") BETWEEN 1 AND 7
      AND "eligible_weekdays" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
    ),
    CONSTRAINT "v2_branch_delivery_configurations_eligibility_window_check" CHECK (
      "eligibility_start_minute" BETWEEN 0 AND 1439
      AND "eligibility_end_minute" BETWEEN 0 AND 1439
      AND "eligibility_start_minute" < "eligibility_end_minute"
    ),
    CONSTRAINT "v2_branch_delivery_configurations_normal_service_window_check" CHECK (
      "normal_service_start_minute" BETWEEN 0 AND 1439
      AND "normal_service_end_minute" BETWEEN 0 AND 1439
      AND "normal_service_start_minute" < "normal_service_end_minute"
    ),
    CONSTRAINT "v2_branch_delivery_configurations_normal_containment_check" CHECK (
      "normal_service_start_minute" >= "eligibility_start_minute"
      AND "normal_service_end_minute" <= "eligibility_end_minute"
    ),
    CONSTRAINT "v2_branch_delivery_configurations_surcharge_check" CHECK ("special_hours_surcharge" >= 0),
    CONSTRAINT "v2_branch_delivery_configurations_reservation_minutes_check" CHECK ("transport_reservation_minutes" >= 0)
);

-- CreateTable
CREATE TABLE "v2_branch_delivery_distance_price_bands" (
    "id" TEXT NOT NULL,
    "branch_delivery_configuration_id" TEXT NOT NULL,
    "max_distance_meters" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "v2_branch_delivery_distance_price_bands_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "v2_branch_delivery_bands_max_distance_check" CHECK ("max_distance_meters" > 0),
    CONSTRAINT "v2_branch_delivery_bands_price_check" CHECK ("price" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_branch_delivery_configurations_tenant_branch_key"
ON "v2_branch_delivery_configurations"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "v2_branch_delivery_configurations_branch_id_idx"
ON "v2_branch_delivery_configurations"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_branch_delivery_bands_config_max_distance_key"
ON "v2_branch_delivery_distance_price_bands"("branch_delivery_configuration_id", "max_distance_meters");

-- AddForeignKey
ALTER TABLE "v2_branch_delivery_configurations"
ADD CONSTRAINT "v2_branch_delivery_configurations_branch_tenant_fkey"
FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "v2_branches"("id", "tenant_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_branch_delivery_distance_price_bands"
ADD CONSTRAINT "v2_branch_delivery_bands_configuration_fkey"
FOREIGN KEY ("branch_delivery_configuration_id") REFERENCES "v2_branch_delivery_configurations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
