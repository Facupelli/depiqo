# Pricing MVP TODO

## Existing capabilities

Pricing creates rate plans and tiers, attaches plans to rental offers, lists plans and offer pricing, calculates storefront carts and draft/confirmed rental snapshots, and creates/updates/lists promotions. The engine supports duration policy, promotions, coupons, structured breakdowns, and manual draft adjustments.

## Missing or incomplete capabilities

### [ ] Correct, deactivate, and version rate plans

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff fixes pricing or retires a plan without changing accepted rentals or unintentionally changing every shared offer.
- **Current evidence:** `V2RatePlan` and tiers are mutable and have `isActive`/`deletedAt`; only create/list capabilities exist. Documentation warns that plans may be shared.
- **Gap:** No supported update, deactivate/reactivate, clone/version, or impact query exists.
- **Expected behavior:** Correct future pricing atomically, validate non-overlapping tiers, expose affected offers, and encourage a new plan when only one offer should change.
- **Lifecycle rules:** Inactive/deleted plans cannot price new confirmations; confirmed snapshots never recalculate.
- **Owning module:** Pricing
- **Dependencies:** Rental Catalog offer references.
- **Side effects:** Pricing-readiness changes for affected offers; no historical mutation.
- **Acceptance criteria:** Staff can safely replace future rates and all affected offers are explicit before activation.
- **Suggested tests:** Tier invariant/unit tests, shared-plan impact integration test, and confirmed-snapshot E2E preservation.
- **Decomposed tasks (one per use case, in recommended order):**
  - [x] **Get rate plan detail and assignment impact:** Return the tenant-scoped plan, ordered tiers, lifecycle state, and every non-deleted rental-offer pricing assignment that references it so staff can see the affected offers before changing shared pricing.
  - [ ] **Clone a rate plan:** Create an independent inactive copy with validated tiers and a tenant-unique staff-supplied name; do not copy offer assignments. This is the safe starting point when a change should affect only selected offers.
  - [x] **Correct a rate plan:** Atomically replace the plan's editable fields and complete tier set through the `RatePlan` invariants; reject missing/deleted/cross-tenant plans and invalid or conflicting tier ranges. Return the affected offer IDs (or require an impact acknowledgement) so a shared-plan change cannot be presented as isolated.
  - [ ] **Deactivate a rate plan:** Mark a tenant-scoped active plan inactive and return its affected offer IDs; immediately exclude it from storefront pricing and new draft/confirmation pricing without changing confirmed snapshots or deleting assignments.
  - [ ] **Reactivate a rate plan:** Activate a tenant-scoped inactive, non-deleted plan only after its complete tier set passes current invariants; return affected offer IDs and make eligible active assignments priceable again.
- **Cross-use-case verification:** Cover shared-plan correction, clone isolation, deactivation/reactivation, invalid tiers, tenant isolation, and proof that an already confirmed rental retains its accepted pricing snapshot.

### [ ] Deactivate, replace, and detach offer pricing assignments

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** A branch offer stops being bookable or switches to a different rate plan.
- **Current evidence:** Attach/create-and-attach exist; `V2RentalOfferPricing.isActive` and `deletedAt` exist with one assignment per offer, but no lifecycle endpoint is exposed.
- **Gap:** Incorrect pricing attachment cannot be removed or intentionally suspended.
- **Expected behavior:** Replace assignment atomically and deactivate/reactivate it; storefront and confirmation reject offers without active pricing.
- **Lifecycle rules:** Cross-tenant/inactive offers or plans are rejected; old rentals retain accepted snapshots.
- **Owning module:** Pricing
- **Dependencies:** Rental Catalog validates offer existence and lifecycle.
- **Side effects:** Bookability/readiness changes.
- **Acceptance criteria:** Storefront price and rental confirmation immediately follow active assignment state.
- **Suggested tests:** E2E replacement/deactivation/reactivation, race/uniqueness, and snapshot preservation.
- **Decomposed tasks (one per use case, in recommended order):**
  - [x] **Replace an offer's rate plan:** Make the existing attach use case's replacement semantics explicit and atomic: validate the tenant-scoped, non-deleted offer and active plan, then upsert the offer's single assignment, reactivate it, and clear `deletedAt`. Preserve the assignment uniqueness guarantee under concurrent requests and return the resulting assignment ID and rate plan ID.
  - [ ] **Deactivate offer pricing:** Temporarily mark the tenant-scoped active assignment inactive without deleting it; reject missing/deleted/cross-tenant assignments. Storefront pricing, cart/draft pricing, and confirmation must immediately treat the offer as unpriced while confirmed snapshots remain unchanged.
  - [ ] **Reactivate offer pricing:** Reactivate a tenant-scoped inactive, non-deleted assignment only when both its offer and rate plan still satisfy lifecycle requirements; reject inactive/deleted/cross-tenant dependencies and make the offer priceable immediately.
  - [x] **Detach offer pricing:** Soft-delete and deactivate the tenant-scoped assignment so the offer intentionally has no pricing. A later attach/replace may restore the unique assignment row, but detachment itself must not remove or mutate the referenced rate plan or historical rental snapshots.
- **Cross-use-case verification:** Cover replacement, deactivation, reactivation, detachment and reattachment, inactive dependencies, tenant isolation, competing replacements, storefront/confirmation rejection, and confirmed-snapshot preservation.

### [ ] Administer coupon lifecycle

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** Staff creates, limits, deactivates, and reviews promotional codes.
- **Current evidence:** `V2Coupon` and `V2CouponRedemption` models plus `CouponValidationService` exist, but there are no coupon controllers/commands/queries.
- **Gap:** Coupon functionality exists only in persistence/engine layers and is not operable end to end.
- **Expected behavior:** Create/list/detail/update/deactivate coupons with validity, usage, customer restriction, and tenant-scoped code uniqueness rules.
- **Lifecycle rules:** Inactive, expired, exhausted, or mismatched coupons fail new calculations; historical applications remain explainable.
- **Owning module:** Pricing
- **Dependencies:** Tenant customer identity for restrictions.
- **Side effects:** Coupon state affects future calculations only.
- **Acceptance criteria:** Staff can manage a coupon and storefront/draft pricing applies or rejects it with a stable reason.
- **Suggested tests:** Validation unit matrix, persistence limits, and storefront E2E application.

### [ ] Redeem and void coupons with rental confirmation/cancellation

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Concurrent confirmations cannot exceed coupon limits, and cancellation releases usage according to policy.
- **Current evidence:** Redemption schema exists and validation reads coupon constraints, but Rental Commitment confirmation does not create a redemption and cancellation does not void one.
- **Gap:** Usage limits are advisory and race-prone because accepted use is not persisted atomically.
- **Expected behavior:** Confirming a coupon-priced rental reserves/redeems usage transactionally; cancellation or repricing voids it under explicit rules.
- **Lifecycle rules:** One active redemption per rental; confirmed snapshots keep the accepted discount even if redemption is later voided.
- **Owning module:** Pricing
- **Dependencies:** Rental Commitment confirmation/cancellation transaction orchestration.
- **Side effects:** Redemption records and usage counters/queries.
- **Acceptance criteria:** Concurrent final uses produce one success; cancellation updates availability without altering the snapshot.
- **Suggested tests:** Database concurrency integration tests and confirmation/cancellation E2E tests.

### [ ] Complete promotion lifecycle controls

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff pauses, resumes, or retires a promotion and can safely correct its scope/effect.
- **Current evidence:** Promotion create/update/list/detail exist and schema has `isActive`, validity, scopes, exclusions, and `deletedAt`; no explicit archive/reactivate behavior or dependency rules are evidenced.
- **Gap:** It is unverified that all lifecycle fields, scope replacement, invalid combinations, and historical use are safely handled.
- **Expected behavior:** Explicitly manage activation and archival, atomically replace scopes/exclusions, and preserve applied promotion details in rental snapshots.
- **Lifecycle rules:** Expired/inactive/deleted promotions do not apply to new prices; confirmed snapshots are immutable.
- **Owning module:** Pricing
- **Dependencies:** Catalog scope validation.
- **Side effects:** Future calculations change; no automatic confirmed-rental rewrite.
- **Acceptance criteria:** Every state transition has deterministic calculation behavior and invalid cross-tenant scopes fail.
- **Suggested tests:** Promotion transition matrix and historical-snapshot E2E tests.
