-- Existing TIMESTAMP WITHOUT TIME ZONE values are UTC wall-clock encodings.
-- The explicit UTC zone prevents PostgreSQL from consulting the session timezone.

ALTER TABLE "v2_coupons"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_coupon_redemptions"
  ALTER COLUMN "redeemed_at" TYPE TIMESTAMPTZ(3) USING "redeemed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "voided_at" TYPE TIMESTAMPTZ(3) USING "voided_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_promotions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_promotion_scopes"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_promotion_exclusions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_offer_pricings"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rate_plans"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rate_plan_tiers"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_customers"
  ALTER COLUMN "email_verified_at" TYPE TIMESTAMPTZ(3) USING "email_verified_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_login_at" TYPE TIMESTAMPTZ(3) USING "last_login_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_customer_auth_identities"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_customer_profiles"
  ALTER COLUMN "reviewed_at" TYPE TIMESTAMPTZ(3) USING "reviewed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_tenant_users"
  ALTER COLUMN "email_verified_at" TYPE TIMESTAMPTZ(3) USING "email_verified_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "password_changed_at" TYPE TIMESTAMPTZ(3) USING "password_changed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_login_at" TYPE TIMESTAMPTZ(3) USING "last_login_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_auth_identities"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_local_credentials"
  ALTER COLUMN "password_updated_at" TYPE TIMESTAMPTZ(3) USING "password_updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_password_reset_tokens"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "used_at" TYPE TIMESTAMPTZ(3) USING "used_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_auth_audit_events"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "session"
  ALTER COLUMN "expire" TYPE TIMESTAMPTZ(6) USING "expire" AT TIME ZONE 'UTC';

ALTER TABLE "v2_owner_contracts"
  ALTER COLUMN "valid_from" TYPE TIMESTAMPTZ(3) USING "valid_from" AT TIME ZONE 'UTC',
  ALTER COLUMN "valid_to" TYPE TIMESTAMPTZ(3) USING "valid_to" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_equipment_types"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "equipment_type_accessory_defaults"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_assets"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_notification_templates"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_notifications"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_notification_deliveries"
  ALTER COLUMN "last_attempt_at" TYPE TIMESTAMPTZ(3) USING "last_attempt_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "sent_at" TYPE TIMESTAMPTZ(3) USING "sent_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "failed_at" TYPE TIMESTAMPTZ(3) USING "failed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelled_at" TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_document_signature_acceptances"
  ALTER COLUMN "receipt_token_expires_at" TYPE TIMESTAMPTZ(3) USING "receipt_token_expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "receipt_downloaded_at" TYPE TIMESTAMPTZ(3) USING "receipt_downloaded_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "accepted_at" TYPE TIMESTAMPTZ(3) USING "accepted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_contracts"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "generated_at" TYPE TIMESTAMPTZ(3) USING "generated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "signed_at" TYPE TIMESTAMPTZ(3) USING "signed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "voided_at" TYPE TIMESTAMPTZ(3) USING "voided_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_document_signing_requests"
  ALTER COLUMN "sent_at" TYPE TIMESTAMPTZ(3) USING "sent_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "viewed_at" TYPE TIMESTAMPTZ(3) USING "viewed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "signed_at" TYPE TIMESTAMPTZ(3) USING "signed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelled_at" TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "failed_at" TYPE TIMESTAMPTZ(3) USING "failed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_contract_artifacts"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "rentable_item_categories"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rentable_items"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_offers"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_fulfillment_requirements"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_owner_splits"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_assigned_assets"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "rental_accessory_asset_assignments"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_demand_lines"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rentals"
  ALTER COLUMN "period_start" TYPE TIMESTAMPTZ(3) USING "period_start" AT TIME ZONE 'UTC',
  ALTER COLUMN "period_end" TYPE TIMESTAMPTZ(3) USING "period_end" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelled_at" TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "confirmed_at" TYPE TIMESTAMPTZ(3) USING "confirmed_at" AT TIME ZONE 'UTC';

ALTER TABLE "rental_delivery_details"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_asset_candidates"
  ALTER COLUMN "projected_at" TYPE TIMESTAMPTZ(3) USING "projected_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_asset_blocks"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "released_at" TYPE TIMESTAMPTZ(3) USING "released_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_rental_selections"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "rental_accessory_selections"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_asset_owners"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_branches"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_branch_schedules"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_tenants"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_tenant_branding"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_tenant_domains"
  ALTER COLUMN "verified_at" TYPE TIMESTAMPTZ(3) USING "verified_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_checked_at" TYPE TIMESTAMPTZ(3) USING "last_checked_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "v2_tenant_contract_signers"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
