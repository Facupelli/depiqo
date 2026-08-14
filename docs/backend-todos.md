# Depiqo backend — open TODOs

## Phase 2 — cross-module persistence cleanup

### Contracts

* [ ] Remove remaining direct Rental Commitment persistence reads from `RentalRemitoReadModelLoader`.

  * Current Rental lifecycle/state read should likely use `RentalLifecycleFacts`.
  * Audit accessory/booking fields separately before extending capabilities.

* [ ] Remove remaining direct Tenant Management persistence reads from `RentalRemitoReadModelLoader`.

  * Tenant identity → existing `TenantIdentityFacts`.
  * Branch/timezone → existing `BranchFacts`.
  * Customer profile → existing `RentalCustomerProfileFacts`.
  * Contract signer → existing `TenantContractSignerFacts`.

* [ ] Verify no other Contracts cross-context Prisma reads remain after Remito cleanup.

### Rental Commitment

* [ ] Remove direct Tenant Management reads from `get-rentals`.

  * Current raw SQL joins branches, tenants, Rental Customers.
  * Must preserve filtering, pagination, search, and timezone semantics.

* [ ] Remove direct Tenant Management customer read from `get-rentals-calendar`.

* [ ] Remove direct Tenant Management branch read from `get-storefront-branches`.

  * It currently needs active storefront branches / delivery-related facts.

* [ ] Remove direct Asset Inventory Equipment Type read from `assign-rental-accessories`.

* [ ] Audit/fix Rental accessory-default flows involving Asset Inventory/Rental Commitment boundary.

### Asset Inventory

* [ ] Remove direct Tenant Management branch reads from Equipment Type summary/read paths.

  * `GetEquipmentTypeSummariesHandler`
  * `GetEquipmentTypeDetailHandler`
  * any remaining branch-summary paths.

* [ ] Fix Rental accessory-default flow where Asset Inventory directly reads Rental Commitment-owned:

  * rentals;
  * demand lines;
  * candidates;
  * asset blocks.

* [ ] Audit candidate projection synchronization after Asset changes:

  * status;
  * branch;
  * ownership;
  * condition / eligibility;
  * retirement;
  * any other candidate-relevant mutation.

* [ ] Review `AssetCreatedIntegrationEvent` only as part of the candidate-projection synchronization work.

### Catalog

* [ ] Audit/fix remaining foreign reads in:

  * `activate-rentable-item`
  * `get-rentable-item-detail`
  * `get-rentable-items`

* [ ] Confirm whether any remaining Tenant Management branch/category or Asset Inventory data is still accessed directly after the recent capability migrations.

### Pricing

* [ ] Audit/fix remaining Catalog persistence read in Rate Plan → Rental Offer assignment if it still exists after phase-1 cleanup.

* [ ] Verify there are no other direct Catalog/Tenant Management persistence reads bypassing the new boundaries.

### Tenant Management

* [ ] Global phase-2 audit for any remaining foreign persistence reads/writes.

  * None prominent are currently known, but still verify.

---

# Rental Commitment domain/event TODOs

* [ ] Decide accepted-pricing revision semantics.

  * Can confirmed edits replace the accepted pricing snapshot?
  * If yes, do downstream artifacts need an accepted-price revision/version check?

---

# Contracts / document semantics

Current behavior uses live serial numbers when rendering and Contracts snapshots the resulting rendered equipment lines.

* [ ] Decide whether accessory physical assignments should appear on Remitos.

  * Rental Commitment supports accessory assignments.
  * Current Remito output does not render their serials/assets.

* [ ] Decide whether Budget PDFs require a durable Contracts-owned historical snapshot.

  * Remitos snapshot consumed legal facts.
  * Budget currently renders a buffer without an equivalent durable snapshot.

* [ ] Decide explicit policy for generating a new document after the Rental Customer has been soft-deleted.

  * Current document-profile reads exclude deleted customers.
  * Inactive customers remain readable.

* [ ] Decide whether multiple active/default Tenant Contract Signers are intentional future functionality.

  * Schema permits it.
  * Current normal create/update flows effectively assume one active signer.

* [ ] Determine whether `bookingSnapshot` is genuinely part of Contracts legal/document data.

  * Remito loader reads it.
  * Audit found it was not actually used in the rendered/persisted Remito output.

---

# Contracts signing workflow

* [ ] Decide whether signing-request persistence and invitation delivery need compensation/retry semantics.

  * Current behavior intentionally remains:

    1. create/update signing request;
    2. attempt notification delivery;
    3. delivery can fail while the request remains persisted.
  * Do not treat this as an accidental transaction bug until product semantics are decided.

---

# Testing deferred until cleanup is complete

* [ ] Run the comprehensive backend test pass after phase-2/TODO cleanup.

* [ ] Revisit accepted-pricing persisted V1 compatibility coverage.

  * Consider a literal persisted V1 JSON fixture if equivalent coverage does not already exist.

* [ ] Review existing tests that were deliberately not expanded during the boundary refactors.

---

# Tooling / infrastructure

* [ ] Investigate workspace ESLint resolution inconsistency.

  * Several tasks have shown package/root commands failing with `eslint: not found`.
  * Backend-local lint often succeeds.
  * This is separate from domain architecture work.


