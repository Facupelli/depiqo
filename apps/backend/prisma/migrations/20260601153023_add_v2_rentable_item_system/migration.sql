-- CreateEnum
CREATE TYPE "V2AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "V2OwnerContractBasis" AS ENUM ('GROSS', 'NET');

-- CreateEnum
CREATE TYPE "V2RentableItemKind" AS ENUM ('SINGLE', 'PACKAGE', 'KIT', 'BUNDLE');

-- CreateEnum
CREATE TYPE "V2RentableItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "V2ContractStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNING_REQUESTED', 'SIGNED', 'RESIGN_REQUIRED', 'VOID');

-- CreateEnum
CREATE TYPE "V2DocumentSigningRequestStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "V2NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionActivation" AS ENUM ('AUTOMATIC', 'COUPON_REQUIRED');

-- CreateEnum
CREATE TYPE "PromotionEffectType" AS ENUM ('PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF');

-- CreateEnum
CREATE TYPE "PromotionApplicationTarget" AS ENUM ('ORDER', 'ELIGIBLE_LINES');

-- CreateEnum
CREATE TYPE "V2BillingUnit" AS ENUM ('HOUR', 'DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "V2SelectedAccessoryStatus" AS ENUM ('SUGGESTED', 'SELECTED', 'REMOVED', 'PARTIALLY_AVAILABLE');

-- CreateEnum
CREATE TYPE "V2AssetBlockType" AS ENUM ('EQUIPMENT', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "V2RentalAssetOwnershipKind" AS ENUM ('TENANT_OWNED', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "V2RentalOwnerSplitStatus" AS ENUM ('PENDING', 'CONFIRMED', 'VOID', 'SETTLED');

-- CreateEnum
CREATE TYPE "V2RentalStatus" AS ENUM ('PENDING', 'DRAFT', 'CONFIRMED', 'PREPARED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "V2RentalSource" AS ENUM ('STAFF', 'WHATSAPP_FLOW', 'FORMAL');

-- CreateEnum
CREATE TYPE "V2TrackingMode" AS ENUM ('IDENTIFIED', 'POOLED');

-- CreateEnum
CREATE TYPE "V2FulfillmentMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "V2BranchScheduleSlotType" AS ENUM ('PICKUP', 'RETURN');

-- CreateEnum
CREATE TYPE "V2RentalCustomerOnboardingStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "V2TenantStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "v2_assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "serial_number" TEXT,
    "notes" TEXT,
    "status" "V2AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_equipment_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_asset_owners" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_info" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_asset_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_owner_contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "terms" JSONB NOT NULL DEFAULT '{}',
    "basis" "V2OwnerContractBasis" NOT NULL,
    "owner_share" DECIMAL(65,30) NOT NULL,
    "rental_share" DECIMAL(65,30) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_owner_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_equipment_accessory_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "primary_equipment_type_id" TEXT NOT NULL,
    "accessory_equipment_type_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "default_quantity" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_equipment_accessory_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rentable_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "category_id" TEXT,
    "kind" "V2RentableItemKind" NOT NULL,
    "status" "V2RentableItemStatus" NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rentable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_offers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "rentable_item_id" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_rentable" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rental_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_fulfillment_requirements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rentable_item_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "quantity_per_item" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_fulfillment_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "status" "V2ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "document_key" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_document_signing_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT,
    "signer_phone" TEXT,
    "status" "V2DocumentSigningRequestStatus" NOT NULL DEFAULT 'PENDING',
    "provider_data" JSONB NOT NULL DEFAULT '{}',
    "signed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_document_signing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notification_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notification_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "V2NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_coupons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "max_uses" INTEGER,
    "max_uses_per_customer" INTEGER,
    "restricted_to_customer_id" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_coupon_redemptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMP(3),

    CONSTRAINT "v2_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activation" "PromotionActivation" NOT NULL DEFAULT 'AUTOMATIC',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "effect_type" "PromotionEffectType" NOT NULL,
    "effect_value" DECIMAL(65,30) NOT NULL,
    "target" "PromotionApplicationTarget" NOT NULL DEFAULT 'ORDER',
    "min_order_subtotal" DECIMAL(65,30),
    "min_rental_units" INTEGER,
    "max_rental_units" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_promotion_scopes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "applies_to_all" BOOLEAN NOT NULL DEFAULT false,
    "rentable_item_id" TEXT,
    "rental_offer_id" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_promotion_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_promotion_exclusions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "rentable_item_id" TEXT,
    "rental_offer_id" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_promotion_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rate_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_unit" "V2BillingUnit" NOT NULL,
    "currency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rate_plan_tiers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "from_unit" INTEGER NOT NULL,
    "to_unit" INTEGER,
    "price_per_unit" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rate_plan_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_offer_pricings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "catalog_rental_offer_id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rental_offer_pricings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_selected_accessories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "rental_demand_line_id" TEXT,
    "accessory_equipment_type_id" TEXT NOT NULL,
    "accessory_name_snapshot" TEXT NOT NULL,
    "quantity_suggested" INTEGER,
    "quantity_selected" INTEGER NOT NULL,
    "status" "V2SelectedAccessoryStatus" NOT NULL DEFAULT 'SELECTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_selected_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_assigned_asset_references" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "rental_demand_line_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_assigned_asset_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_asset_blocks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period" tstzrange NOT NULL,
    "block_type" "V2AssetBlockType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "v2_asset_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_asset_candidates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "asset_status" "V2AssetStatus" NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "is_rentable" BOOLEAN NOT NULL,
    "ownership_kind" "V2RentalAssetOwnershipKind" NOT NULL,
    "owner_id" TEXT,
    "owner_contract_snapshot" JSONB,
    "projected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rental_asset_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_owner_splits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "rental_selection_id" TEXT,
    "assigned_asset_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "status" "V2RentalOwnerSplitStatus" NOT NULL DEFAULT 'PENDING',
    "owner_share" DECIMAL(65,30) NOT NULL,
    "rental_share" DECIMAL(65,30) NOT NULL,
    "basis" "V2OwnerContractBasis" NOT NULL,
    "gross_amount" DECIMAL(65,30) NOT NULL,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "owner_amount" DECIMAL(65,30) NOT NULL,
    "rental_amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_rental_owner_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_demand_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "rental_selection_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "equipment_type_name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_rental_demand_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_selections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "rental_offer_id" TEXT NOT NULL,
    "rentable_item_id" TEXT NOT NULL,
    "rentable_item_name_snapshot" TEXT NOT NULL,
    "rentable_item_kind_snapshot" "V2RentableItemKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_rental_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rentals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "V2RentalStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillment_method" "V2FulfillmentMethod",
    "notes" TEXT,
    "insurance_selected" BOOLEAN NOT NULL DEFAULT false,
    "booking_snapshot" JSONB,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "price_snapshot" JSONB,
    "source" "V2RentalSource",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "v2_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "supports_delivery" BOOLEAN NOT NULL DEFAULT false,
    "delivery_default_country" TEXT,
    "delivery_default_state_region" TEXT,
    "delivery_default_city" TEXT,
    "delivery_default_postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_branch_schedules" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "type" "V2BranchScheduleSlotType" NOT NULL,
    "day_of_week" INTEGER,
    "specific_date" DATE,
    "open_time" INTEGER NOT NULL,
    "close_time" INTEGER NOT NULL,
    "slot_interval_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_branch_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_rental_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_company" BOOLEAN NOT NULL DEFAULT false,
    "company_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_status" "V2RentalCustomerOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "profile_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_rental_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "V2TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "v2_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "v2_assets_tenant_id_branch_id_equipment_type_id_status_dele_idx" ON "v2_assets"("tenant_id", "branch_id", "equipment_type_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_assets_tenant_id_equipment_type_id_branch_id_status_dele_idx" ON "v2_assets"("tenant_id", "equipment_type_id", "branch_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_equipment_types_tenant_id_is_active_deleted_at_idx" ON "v2_equipment_types"("tenant_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_asset_owners_tenant_id_name_idx" ON "v2_asset_owners"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "v2_owner_contracts_tenant_id_owner_id_valid_from_valid_to_idx" ON "v2_owner_contracts"("tenant_id", "owner_id", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "v2_owner_contracts_asset_id_idx" ON "v2_owner_contracts"("asset_id");

-- CreateIndex
CREATE INDEX "v2_equipment_accessory_rules_tenant_id_primary_equipment_ty_idx" ON "v2_equipment_accessory_rules"("tenant_id", "primary_equipment_type_id");

-- CreateIndex
CREATE INDEX "v2_equipment_accessory_rules_tenant_id_accessory_equipment__idx" ON "v2_equipment_accessory_rules"("tenant_id", "accessory_equipment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_equipment_accessory_rules_tenant_id_primary_equipment_ty_key" ON "v2_equipment_accessory_rules"("tenant_id", "primary_equipment_type_id", "accessory_equipment_type_id");

-- CreateIndex
CREATE INDEX "v2_rentable_items_tenant_id_status_deleted_at_category_id_idx" ON "v2_rentable_items"("tenant_id", "status", "deleted_at", "category_id");

-- CreateIndex
CREATE INDEX "v2_rental_offers_tenant_id_branch_id_is_visible_is_rentable_idx" ON "v2_rental_offers"("tenant_id", "branch_id", "is_visible", "is_rentable", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_rental_offers_rentable_item_id_idx" ON "v2_rental_offers"("rentable_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_offers_tenant_id_branch_id_rentable_item_id_delet_key" ON "v2_rental_offers"("tenant_id", "branch_id", "rentable_item_id", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_fulfillment_requirements_tenant_id_rentable_item_id_idx" ON "v2_fulfillment_requirements"("tenant_id", "rentable_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_fulfillment_requirements_rentable_item_id_equipment_type_key" ON "v2_fulfillment_requirements"("rentable_item_id", "equipment_type_id");

-- CreateIndex
CREATE INDEX "v2_contracts_tenant_id_rental_id_status_idx" ON "v2_contracts"("tenant_id", "rental_id", "status");

-- CreateIndex
CREATE INDEX "v2_document_signing_requests_tenant_id_rental_id_status_idx" ON "v2_document_signing_requests"("tenant_id", "rental_id", "status");

-- CreateIndex
CREATE INDEX "v2_document_signing_requests_contract_id_idx" ON "v2_document_signing_requests"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_notification_templates_tenant_id_code_channel_key" ON "v2_notification_templates"("tenant_id", "code", "channel");

-- CreateIndex
CREATE INDEX "v2_notifications_tenant_id_created_at_idx" ON "v2_notifications"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "v2_notification_deliveries_tenant_id_status_created_at_idx" ON "v2_notification_deliveries"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "v2_notification_deliveries_notification_id_idx" ON "v2_notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "v2_coupons_tenant_id_is_active_idx" ON "v2_coupons"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "v2_coupons_promotion_id_idx" ON "v2_coupons"("promotion_id");

-- CreateIndex
CREATE INDEX "v2_coupons_restricted_to_customer_id_idx" ON "v2_coupons"("restricted_to_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_coupons_tenant_id_code_key" ON "v2_coupons"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "v2_coupon_redemptions_order_id_key" ON "v2_coupon_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "v2_coupon_redemptions_tenant_id_coupon_id_voided_at_idx" ON "v2_coupon_redemptions"("tenant_id", "coupon_id", "voided_at");

-- CreateIndex
CREATE INDEX "v2_coupon_redemptions_coupon_id_voided_at_idx" ON "v2_coupon_redemptions"("coupon_id", "voided_at");

-- CreateIndex
CREATE INDEX "v2_coupon_redemptions_coupon_id_customer_id_voided_at_idx" ON "v2_coupon_redemptions"("coupon_id", "customer_id", "voided_at");

-- CreateIndex
CREATE INDEX "v2_coupon_redemptions_order_id_idx" ON "v2_coupon_redemptions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_coupon_redemptions_coupon_id_order_id_key" ON "v2_coupon_redemptions"("coupon_id", "order_id");

-- CreateIndex
CREATE INDEX "v2_promotions_tenant_id_is_active_activation_priority_idx" ON "v2_promotions"("tenant_id", "is_active", "activation", "priority");

-- CreateIndex
CREATE INDEX "v2_promotions_tenant_id_valid_from_valid_until_idx" ON "v2_promotions"("tenant_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "v2_promotion_scopes_tenant_id_idx" ON "v2_promotion_scopes"("tenant_id");

-- CreateIndex
CREATE INDEX "v2_promotion_scopes_promotion_id_idx" ON "v2_promotion_scopes"("promotion_id");

-- CreateIndex
CREATE INDEX "v2_promotion_scopes_rentable_item_id_idx" ON "v2_promotion_scopes"("rentable_item_id");

-- CreateIndex
CREATE INDEX "v2_promotion_scopes_rental_offer_id_idx" ON "v2_promotion_scopes"("rental_offer_id");

-- CreateIndex
CREATE INDEX "v2_promotion_scopes_category_id_idx" ON "v2_promotion_scopes"("category_id");

-- CreateIndex
CREATE INDEX "v2_promotion_exclusions_tenant_id_idx" ON "v2_promotion_exclusions"("tenant_id");

-- CreateIndex
CREATE INDEX "v2_promotion_exclusions_promotion_id_idx" ON "v2_promotion_exclusions"("promotion_id");

-- CreateIndex
CREATE INDEX "v2_promotion_exclusions_rentable_item_id_idx" ON "v2_promotion_exclusions"("rentable_item_id");

-- CreateIndex
CREATE INDEX "v2_promotion_exclusions_rental_offer_id_idx" ON "v2_promotion_exclusions"("rental_offer_id");

-- CreateIndex
CREATE INDEX "v2_promotion_exclusions_category_id_idx" ON "v2_promotion_exclusions"("category_id");

-- CreateIndex
CREATE INDEX "v2_rate_plans_tenant_id_is_active_idx" ON "v2_rate_plans"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "v2_rate_plan_tiers_tenant_id_idx" ON "v2_rate_plan_tiers"("tenant_id");

-- CreateIndex
CREATE INDEX "v2_rate_plan_tiers_rate_plan_id_idx" ON "v2_rate_plan_tiers"("rate_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rate_plan_tiers_rate_plan_id_from_unit_key" ON "v2_rate_plan_tiers"("rate_plan_id", "from_unit");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_offer_pricings_catalog_rental_offer_id_key" ON "v2_rental_offer_pricings"("catalog_rental_offer_id");

-- CreateIndex
CREATE INDEX "v2_rental_offer_pricings_tenant_id_is_active_deleted_at_idx" ON "v2_rental_offer_pricings"("tenant_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_rental_offer_pricings_rate_plan_id_idx" ON "v2_rental_offer_pricings"("rate_plan_id");

-- CreateIndex
CREATE INDEX "v2_selected_accessories_tenant_id_rental_id_idx" ON "v2_selected_accessories"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_selected_accessories_rental_demand_line_id_idx" ON "v2_selected_accessories"("rental_demand_line_id");

-- CreateIndex
CREATE INDEX "v2_selected_accessories_accessory_equipment_type_id_idx" ON "v2_selected_accessories"("accessory_equipment_type_id");

-- CreateIndex
CREATE INDEX "v2_assigned_asset_references_tenant_id_rental_id_idx" ON "v2_assigned_asset_references"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_assigned_asset_references_asset_id_idx" ON "v2_assigned_asset_references"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_assigned_asset_references_rental_demand_line_id_asset_id_key" ON "v2_assigned_asset_references"("rental_demand_line_id", "asset_id");

-- CreateIndex
CREATE INDEX "v2_asset_blocks_tenant_id_rental_id_idx" ON "v2_asset_blocks"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_asset_blocks_asset_id_idx" ON "v2_asset_blocks"("asset_id");

-- CreateIndex
CREATE INDEX "v2_asset_blocks_tenant_id_asset_id_released_at_idx" ON "v2_asset_blocks"("tenant_id", "asset_id", "released_at");

-- CreateIndex
CREATE INDEX "v2_asset_candidates_rentable_idx" ON "v2_rental_asset_candidates"("tenant_id", "branch_id", "equipment_type_id", "is_active", "is_rentable");

-- CreateIndex
CREATE INDEX "v2_asset_candidates_status_idx" ON "v2_rental_asset_candidates"("tenant_id", "branch_id", "equipment_type_id", "asset_status");

-- CreateIndex
CREATE INDEX "v2_rental_asset_candidates_tenant_id_asset_id_idx" ON "v2_rental_asset_candidates"("tenant_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_asset_candidates_tenant_id_asset_id_key" ON "v2_rental_asset_candidates"("tenant_id", "asset_id");

-- CreateIndex
CREATE INDEX "v2_rental_owner_splits_tenant_id_rental_id_idx" ON "v2_rental_owner_splits"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_rental_owner_splits_owner_id_status_idx" ON "v2_rental_owner_splits"("owner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_owner_splits_rental_id_assigned_asset_id_key" ON "v2_rental_owner_splits"("rental_id", "assigned_asset_id");

-- CreateIndex
CREATE INDEX "v2_rental_demand_lines_tenant_id_rental_id_idx" ON "v2_rental_demand_lines"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_rental_demand_lines_tenant_id_equipment_type_id_idx" ON "v2_rental_demand_lines"("tenant_id", "equipment_type_id");

-- CreateIndex
CREATE INDEX "v2_rental_demand_lines_rental_selection_id_idx" ON "v2_rental_demand_lines"("rental_selection_id");

-- CreateIndex
CREATE INDEX "v2_rental_selections_tenant_id_rental_id_idx" ON "v2_rental_selections"("tenant_id", "rental_id");

-- CreateIndex
CREATE INDEX "v2_rental_selections_rental_offer_id_idx" ON "v2_rental_selections"("rental_offer_id");

-- CreateIndex
CREATE INDEX "v2_rental_selections_rentable_item_id_idx" ON "v2_rental_selections"("rentable_item_id");

-- CreateIndex
CREATE INDEX "v2_rentals_tenant_id_branch_id_status_created_at_idx" ON "v2_rentals"("tenant_id", "branch_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "v2_rentals_tenant_id_branch_id_period_start_period_end_idx" ON "v2_rentals"("tenant_id", "branch_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "v2_rentals_tenant_id_customer_id_idx" ON "v2_rentals"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "v2_branches_tenant_id_is_active_deleted_at_idx" ON "v2_branches"("tenant_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_branch_schedules_branch_id_type_idx" ON "v2_branch_schedules"("branch_id", "type");

-- CreateIndex
CREATE INDEX "v2_rental_customers_tenant_id_is_active_deleted_at_idx" ON "v2_rental_customers"("tenant_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "v2_rental_customers_tenant_id_is_company_idx" ON "v2_rental_customers"("tenant_id", "is_company");

-- CreateIndex
CREATE UNIQUE INDEX "v2_rental_customers_tenant_id_email_key" ON "v2_rental_customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenants_slug_key" ON "v2_tenants"("slug");

-- CreateIndex
CREATE INDEX "v2_tenants_status_deleted_at_idx" ON "v2_tenants"("status", "deleted_at");

-- AddForeignKey
ALTER TABLE "v2_assets" ADD CONSTRAINT "v2_assets_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "v2_equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_assets" ADD CONSTRAINT "v2_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "v2_asset_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_owner_contracts" ADD CONSTRAINT "v2_owner_contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "v2_asset_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_owner_contracts" ADD CONSTRAINT "v2_owner_contracts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "v2_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_offers" ADD CONSTRAINT "v2_rental_offers_rentable_item_id_fkey" FOREIGN KEY ("rentable_item_id") REFERENCES "v2_rentable_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_fulfillment_requirements" ADD CONSTRAINT "v2_fulfillment_requirements_rentable_item_id_fkey" FOREIGN KEY ("rentable_item_id") REFERENCES "v2_rentable_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_document_signing_requests" ADD CONSTRAINT "v2_document_signing_requests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "v2_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_notifications" ADD CONSTRAINT "v2_notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "v2_notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_notification_deliveries" ADD CONSTRAINT "v2_notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "v2_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_coupons" ADD CONSTRAINT "v2_coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "v2_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_coupon_redemptions" ADD CONSTRAINT "v2_coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "v2_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_promotion_scopes" ADD CONSTRAINT "v2_promotion_scopes_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "v2_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_promotion_exclusions" ADD CONSTRAINT "v2_promotion_exclusions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "v2_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rate_plan_tiers" ADD CONSTRAINT "v2_rate_plan_tiers_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "v2_rate_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_offer_pricings" ADD CONSTRAINT "v2_rental_offer_pricings_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "v2_rate_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_selected_accessories" ADD CONSTRAINT "v2_selected_accessories_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_selected_accessories" ADD CONSTRAINT "v2_selected_accessories_rental_demand_line_id_fkey" FOREIGN KEY ("rental_demand_line_id") REFERENCES "v2_rental_demand_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_assigned_asset_references" ADD CONSTRAINT "v2_assigned_asset_references_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_assigned_asset_references" ADD CONSTRAINT "v2_assigned_asset_references_rental_demand_line_id_fkey" FOREIGN KEY ("rental_demand_line_id") REFERENCES "v2_rental_demand_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_asset_blocks" ADD CONSTRAINT "v2_asset_blocks_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_owner_splits" ADD CONSTRAINT "v2_rental_owner_splits_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_demand_lines" ADD CONSTRAINT "v2_rental_demand_lines_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_demand_lines" ADD CONSTRAINT "v2_rental_demand_lines_rental_selection_id_fkey" FOREIGN KEY ("rental_selection_id") REFERENCES "v2_rental_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_selections" ADD CONSTRAINT "v2_rental_selections_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "v2_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_branches" ADD CONSTRAINT "v2_branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_branch_schedules" ADD CONSTRAINT "v2_branch_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "v2_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_rental_customers" ADD CONSTRAINT "v2_rental_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "v2_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
