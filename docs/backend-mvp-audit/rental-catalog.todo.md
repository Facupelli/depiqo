# Rental Catalog MVP TODO

## Existing capabilities

The module creates categories, rentable-item offerings and branch offers, activates rentable items, resolves selections, and provides backoffice/storefront listing, detail, search, pagination, and category queries. `RentableItem` snapshots and fulfillment requirements are exposed through `CatalogPublicApi`.

## Missing or incomplete capabilities

### [ ] Correct rentable items and fulfillment requirements

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff fixes a name/image/category or changes the equipment quantities required by an offer before future bookings.
- **Current evidence:** `V2RentableItem` and `V2RentableItemRequirement` have mutable fields and mapper update support, but `catalog/features/` exposes creation and activation only.
- **Gap:** Catalog facts and package composition cannot be corrected after creation.
- **Expected behavior:** Update presentation and atomically replace validated requirements through Catalog-owned rules; existing rental snapshots remain unchanged.
- **Lifecycle rules:** Draft/inactive items may be edited freely; active requirement changes apply only to future selections and require positive, same-tenant equipment references.
- **Owning module:** Rental Catalog
- **Dependencies:** Asset Inventory equipment-type validation.
- **Side effects:** Emit catalog change events; never mutate confirmed selections/demand lines.
- **Acceptance criteria:** Subsequent resolutions use the new definition while old rentals retain their original selections and demand.
- **Suggested tests:** Aggregate/unit validation, repository replacement transaction, and E2E historical-snapshot preservation.

### [ ] Manage rental-offer visibility, rentability, and lifecycle

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff hides or stops renting an item at one branch without deleting its history, then later restores it.
- **Current evidence:** `V2RentalOffer.isVisible`, `isRentable`, and `deletedAt` exist; storefront queries filter these fields, but only offer creation exists.
- **Gap:** There is no update, deactivate/archive, reactivate, or branch-offer correction capability.
- **Expected behavior:** Authorized staff can independently control visibility and rentability, archive/reactivate an offer, and prevent new selection while preserving references.
- **Lifecycle rules:** Archived/deleted offers cannot be selected; state changes do not alter committed rentals.
- **Owning module:** Rental Catalog
- **Dependencies:** Pricing assignment readiness and Tenant Management branch validation.
- **Side effects:** Storefront/search projections change; optional catalog events notify caches.
- **Acceptance criteria:** State changes are immediately reflected in storefront and selection resolution, and historical detail still resolves snapshots.
- **Suggested tests:** E2E visibility/rentability matrix, archive/reactivate, cross-tenant denial, and existing-rental preservation.

### [ ] Archive/deactivate and reactivate rentable items

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** A product is retired globally but remains visible in historical rentals.
- **Current evidence:** `activate-rentable-item` supports one direction and `V2RentableItemStatus`/`deletedAt` support lifecycle state; no reverse command exists.
- **Gap:** Activation is irreversible through application capabilities, and item-level retirement behavior for branch offers is undefined.
- **Expected behavior:** Archive/deactivate and reactivate explicitly, with readiness validation on reactivation and no hard deletion of referenced items.
- **Lifecycle rules:** Only valid, requirement-complete items activate; archived items and all their offers reject new selection.
- **Owning module:** Rental Catalog
- **Dependencies:** Asset Inventory validation and Pricing readiness queries.
- **Side effects:** Storefront removal and lifecycle event; confirmed snapshots remain immutable.
- **Acceptance criteria:** Retirement blocks all new selections and reactivation only succeeds when catalog invariants are satisfied.
- **Suggested tests:** State-transition unit tests and multi-branch E2E retirement/reactivation.

### [ ] Maintain category lifecycle and ordering

- **Priority:** P2
- **Status:** Missing
- **MVP scenario:** Staff renames, reorders, hides, or retires a browsing category.
- **Current evidence:** Category create/list and `V2RentableItemCategory.sortOrder`, `isActive`, and `deletedAt` exist; no update/lifecycle command exists.
- **Gap:** Storefront navigation cannot be corrected or curated after creation.
- **Expected behavior:** Update name/order and deactivate/reactivate categories without deleting assigned historical items.
- **Lifecycle rules:** Inactive categories are omitted from storefront; item handling on deactivation is explicit and non-destructive.
- **Owning module:** Rental Catalog
- **Dependencies:** None beyond tenant authorization.
- **Side effects:** Storefront category ordering/visibility changes.
- **Acceptance criteria:** Updated ordering is deterministic and inactive categories cannot be selected for new setup unless explicitly allowed.
- **Suggested tests:** Repository ordering, storefront filtering, tenant isolation, and category-with-items lifecycle tests.

### [ ] Enforce module boundaries during catalog activation and reads

- **Priority:** P1
- **Status:** Inconsistent
- **MVP scenario:** Catalog readiness remains correct as inventory, branches, and pricing evolve independently.
- **Current evidence:** `activate-rentable-item.handler.ts` and catalog detail/list handlers contain TODOs and direct Prisma reads of other bounded contexts; creation also notes missing public-API branch/equipment validation.
- **Gap:** Catalog bypasses owning-module public APIs and can validate against inconsistent or incomplete source facts.
- **Expected behavior:** Commands use Tenant Management, Asset Inventory, and Pricing public capabilities; composed reads use explicit read contracts without mutating foreign data.
- **Lifecycle rules:** Activation must reject inactive/mismatched branch, equipment, or pricing references according to readiness rules.
- **Owning module:** Rental Catalog
- **Dependencies:** Public validation/read APIs in owning modules.
- **Side effects:** None beyond reliable readiness decisions.
- **Acceptance criteria:** No Catalog command directly queries foreign write models and boundary tests prove same-tenant active references.
- **Suggested tests:** Contract tests for each public API and E2E activation with inactive/cross-tenant dependencies.
