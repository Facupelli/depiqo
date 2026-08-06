# Asset Inventory MVP TODO

## Existing capabilities

Equipment types and batches of assets can be created, owners with contracts can be created, accessory defaults can be created, and equipment/asset/owner list and detail read models exist. Asset creation emits `AssetCreatedEvent`, consumed by Rental Commitment's candidate projection.

## Missing or incomplete capabilities

### [ ] Correct and deactivate/reactivate equipment types

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff corrects operational metadata or retires a type from future fulfillment.
- **Current evidence:** `V2EquipmentType.isActive`, `deletedAt`, and update timestamps exist, but features expose create and queries only.
- **Gap:** Equipment types cannot be corrected or removed from future setup/assignment safely.
- **Expected behavior:** Update current metadata and explicitly deactivate/reactivate while preserving catalog and rental references.
- **Lifecycle rules:** Inactive types cannot enter new requirements or assignments; reactivation validates tenant-owned current data.
- **Owning module:** Asset Inventory
- **Dependencies:** Catalog validates type state; Rental Commitment candidate synchronization.
- **Side effects:** Emit type lifecycle events; never rewrite demand snapshots.
- **Acceptance criteria:** New setup and assignment reject inactive types while historical rental detail remains intact.
- **Suggested tests:** Domain/repository tests and E2E deactivate/reactivate across catalog setup and rental confirmation.

### [ ] Maintain asset status, branch, ownership, and metadata

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** An asset moves branch, enters maintenance, changes owner, or has its serial/notes corrected.
- **Current evidence:** `V2Asset` stores branch, owner, serial, notes, status, and deletion state; only add/list summaries are exposed.
- **Gap:** Physical truth cannot be maintained after registration and only creation updates the Rental Commitment projection.
- **Expected behavior:** Update fields through eligibility rules, deactivate/reactivate assets, and publish all assignment-relevant changes.
- **Lifecycle rules:** Blocked/assigned assets require explicit handling before branch/type/owner changes; inactive/retired assets cannot receive new assignments.
- **Owning module:** Asset Inventory
- **Dependencies:** Rental Commitment block/assignment inquiry and projection consumers.
- **Side effects:** Idempotent asset-updated/status/branch/ownership events; confirmed assignment and owner-split snapshots stay unchanged.
- **Acceptance criteria:** Candidate state follows every update and no currently committed asset is silently made operationally inconsistent.
- **Suggested tests:** E2E move/maintenance/ownership change with free and blocked assets; event idempotency tests.

### [ ] Retrieve complete asset detail

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff inspects one unit before correction, assignment, pickup, or return.
- **Current evidence:** `get-asset-summaries` exists, but no asset-detail feature is registered; the schema contains owner, status, branch, serial, notes, and contracts.
- **Gap:** Operational staff cannot retrieve a canonical complete current profile for one asset.
- **Expected behavior:** Tenant-scoped detail exposes current inventory-owned facts and clearly separates rental/block projections owned elsewhere.
- **Lifecycle rules:** Soft-deleted assets may be visible only in authorized historical/admin views.
- **Owning module:** Asset Inventory
- **Dependencies:** Optional Rental Commitment public read for current commitments, not direct table access.
- **Side effects:** None.
- **Acceptance criteria:** Detail returns all maintained fields, ownership/contract summary, and correct not-found semantics without cross-tenant leakage.
- **Suggested tests:** Query integration and authorization/tenant-isolation E2E tests.

### [ ] Replace and remove accessory defaults

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff corrects suggested accessories when the preparation standard changes.
- **Current evidence:** Defaults can be created and queried; `V2EquipmentTypeAccessoryDefault` persists relationships, but no update/delete/replace capability exists.
- **Gap:** Mistaken or obsolete defaults are permanent through the API.
- **Expected behavior:** Atomically replace or remove defaults with positive quantities, no self-reference, same-tenant active type validation, and duplicate prevention.
- **Lifecycle rules:** Changes affect future suggestions only, never rental-specific accessory selections.
- **Owning module:** Asset Inventory
- **Dependencies:** None beyond own equipment types.
- **Side effects:** Emit defaults-changed event only if a real consumer needs cache invalidation.
- **Acceptance criteria:** Removed defaults disappear from future suggestions while existing prepared rentals remain unchanged.
- **Suggested tests:** Constraint/unit tests and E2E replace/remove with historical rental accessories.

### [ ] Maintain owners and owner contracts

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** Staff corrects owner contact data, expires a contract, or adds replacement commercial terms.
- **Current evidence:** Owner-with-contract creation and owner list/detail exist; `V2OwnerContract.validFrom/validTo` supports temporal terms, but no update/end/new-contract capability is exposed.
- **Gap:** Current ownership agreements cannot be corrected or renewed after initial creation.
- **Expected behavior:** Update owner current data and create/end versioned contracts without overwriting terms already snapshotted by confirmed rentals.
- **Lifecycle rules:** Overlapping applicable contracts for the same scope are rejected; historical contracts are retained.
- **Owning module:** Asset Inventory
- **Dependencies:** Rental Commitment snapshots the applicable contract at confirmation.
- **Side effects:** Projection updates for future allocation; no confirmed owner-split recalculation.
- **Acceptance criteria:** The applicable contract changes by effective date and old rental splits still show original terms.
- **Suggested tests:** Temporal overlap integration tests and E2E contract replacement plus rental snapshot preservation.

### [ ] Keep rental accessory availability behind Rental Commitment

- **Priority:** P1
- **Status:** Inconsistent
- **MVP scenario:** Accessory suggestions report availability without Inventory becoming authority over rental blocks.
- **Current evidence:** `get-rental-accessory-defaults.handler.ts` directly reads Rental Commitment demand lines and `v2_asset_blocks`, explicitly marked `cross-bounded-context-read`.
- **Gap:** Asset Inventory decides rental-specific availability using foreign persistence despite documentation assigning all block decisions to Rental Commitment.
- **Expected behavior:** Inventory supplies defaults/current asset facts; Rental Commitment composes rental demand, blocks, and allocatable quantities.
- **Lifecycle rules:** Suggestions do not create assignments or blocks.
- **Owning module:** Asset Inventory
- **Dependencies:** Rental Commitment public composition capability.
- **Side effects:** None.
- **Acceptance criteria:** Asset Inventory no longer queries rental tables and returned suggestions remain behaviorally equivalent.
- **Suggested tests:** Public-contract tests and E2E accessory suggestion under overlapping blocks.
