# Asset Inventory MVP TODO

## Existing capabilities

Equipment types and batches of assets can be created, owners with contracts can be created, accessory defaults can be created, and equipment/asset/owner list and detail read models exist. Asset creation emits `AssetCreatedEvent`, consumed by Rental Commitment's candidate projection.

## Missing or incomplete capabilities

### [x] Correct and deactivate/reactivate equipment types

- **Priority:** P0
- **Status:** Completed
- **MVP scenario:** Staff corrects operational metadata or retires a type from future fulfillment.
- **Current evidence:** `V2EquipmentType.isActive`, `deletedAt`, and update timestamps exist, but features expose create and queries only.
- **Gap:** Equipment types cannot be corrected or removed from future setup/assignment safely.
- **Expected behavior:** Update current metadata and explicitly deactivate/reactivate while preserving catalog and rental references.
- **Lifecycle rules:** Inactive types cannot enter new requirements or assignments; reactivation validates tenant-owned current data.
- **Owning module:** Asset Inventory
- **Dependencies:** Catalog validates type state; Rental Commitment candidate synchronization.
- **Side effects:** Emit type lifecycle events; never rewrite demand snapshots.
- **Acceptance criteria:** New setup and assignment reject inactive types while historical rental detail remains intact.
- **Completion note:** Implemented metadata updates, explicit deactivate/reactivate endpoints, lifecycle events, and Rental Commitment candidate synchronization. Projection failures are currently logged and swallowed, so candidate synchronization is not guaranteed if an event handler update fails; durable delivery or retry handling remains a reliability follow-up.
- **Suggested tests:** Domain/repository tests and E2E deactivate/reactivate across catalog setup and rental confirmation.

### Maintain asset status, branch, ownership, and metadata

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** An asset moves branch, enters maintenance, changes owner, or has its serial/notes corrected.
- **Current evidence:** `V2Asset` stores branch, owner, serial, notes, status, and deletion state; only add/list summaries are exposed.
- **Gap:** Physical truth cannot be maintained after registration and only creation updates the Rental Commitment projection.
- **Owning module:** Asset Inventory
- **Overall acceptance criteria:** Candidate state follows every assignment-relevant update and no currently committed asset is silently made operationally inconsistent.

#### [ ] Expose Rental Commitment asset-commitment inquiry

- **Priority:** P0
- **Expected behavior:** Add a Rental Commitment public capability that reports whether a tenant-owned asset has unreleased current or future commitments that constrain assignment-relevant inventory changes.
- **Boundary rules:** Rental Commitment remains the authority over assigned references and asset blocks; Asset Inventory must not query Rental Commitment tables directly.
- **Dependencies:** None.
- **Side effects:** None.
- **Acceptance criteria:** Asset Inventory can distinguish a free asset from one with an unreleased current or future commitment without crossing persistence boundaries.
- **Suggested tests:** Public API integration tests covering free, currently blocked, future-blocked, released, and cross-tenant assets.

#### [ ] Correct asset serial number and notes

- **Priority:** P0
- **Expected behavior:** Allow tenant-scoped correction of `serialNumber` and `notes`, including serial normalization and duplicate prevention.
- **Lifecycle rules:** Metadata-only corrections do not require commitment handling and must not modify confirmed rental facts.
- **Dependencies:** None.
- **Side effects:** Do not publish projection events unless the projection later includes one of these fields.
- **Acceptance criteria:** Staff can correct metadata, duplicate active serial numbers are rejected, and cross-tenant assets remain inaccessible.
- **Suggested tests:** Domain/repository tests and E2E correction, duplicate serial, no-op, not-found, and tenant-isolation cases.

#### [ ] Maintain asset operational status

- **Priority:** P0
- **Expected behavior:** Support explicit operational status transitions, including maintenance semantics, and remove non-operational assets from future assignment eligibility.
- **Lifecycle rules:** Assignment-relevant status changes require commitment inquiry; retired assets cannot receive new assignments. Decide before implementation whether maintenance is a dedicated `MAINTENANCE` status or an `INACTIVE` reason, and whether retirement is terminal.
- **Dependencies:** Rental Commitment asset-commitment inquiry and candidate projection consumer.
- **Side effects:** Emit an idempotent asset-status-changed event after successful persistence; confirmed assignments and snapshots remain unchanged.
- **Acceptance criteria:** Free assets can transition through supported statuses, constrained assets are explicitly rejected or handled, and candidate eligibility follows successful transitions.
- **Suggested tests:** Domain transition tests and E2E active/maintenance/inactive/retired changes for free and committed assets.

#### [ ] Move an asset to another branch

- **Priority:** P0
- **Expected behavior:** Move an asset to a same-tenant valid branch after checking rental commitments.
- **Lifecycle rules:** A committed asset cannot be silently moved; define an explicit override workflow separately if rejection is insufficient.
- **Dependencies:** Tenant Management branch validation, Rental Commitment asset-commitment inquiry, and candidate projection consumer.
- **Side effects:** Emit an idempotent asset-branch-changed event after successful persistence.
- **Acceptance criteria:** A free asset can move to a valid branch, invalid or cross-tenant branches are rejected, constrained assets are explicitly rejected or handled, and the candidate branch is synchronized.
- **Suggested tests:** E2E branch move for free, current-blocked, future-blocked, released, invalid-branch, and cross-tenant assets.

#### [ ] Change current asset ownership

- **Priority:** P0
- **Expected behavior:** Change an asset between tenant-owned and third-party-owned states, validating the target owner and applicable contract when required.
- **Lifecycle rules:** A committed asset cannot be silently transferred; confirmed owner-split snapshots must never be recalculated from current ownership.
- **Dependencies:** Rental Commitment asset-commitment inquiry and candidate projection consumer.
- **Side effects:** Emit an idempotent asset-ownership-changed event with the current ownership projection payload after successful persistence.
- **Acceptance criteria:** Valid free-asset ownership changes succeed, invalid owners/contracts and constrained assets are rejected or explicitly handled, candidate ownership is synchronized, and historical rental splits remain unchanged.
- **Suggested tests:** E2E tenant-to-third-party, third-party-to-tenant, owner replacement, missing/ambiguous contract, committed asset, and snapshot-preservation cases.

#### [ ] Deactivate and reactivate assets

- **Priority:** P0
- **Expected behavior:** Expose explicit, idempotent deactivate and reactivate operations instead of hiding lifecycle changes in a generic update.
- **Lifecycle rules:** Deactivation requires commitment inquiry; reactivation validates current tenant-owned branch, equipment type, ownership, and status data. Retired assets remain non-reactivatable if retirement is defined as terminal.
- **Dependencies:** Rental Commitment asset-commitment inquiry and candidate projection consumer, plus current Asset Inventory and Tenant Management validation.
- **Side effects:** Emit idempotent asset lifecycle events after successful persistence.
- **Acceptance criteria:** Free assets can be deactivated/reactivated safely, constrained deactivation is rejected or explicitly handled, invalid reactivation is rejected, and inactive/retired assets cannot receive new assignments.
- **Suggested tests:** E2E deactivate/reactivate for free and committed assets, repeated requests, invalid current references, and retired assets.

#### [ ] Decide and optionally support asset equipment-type changes

- **Priority:** P0
- **Status:** Decision required
- **Expected behavior:** Decide whether correcting an asset's equipment type belongs in the MVP. If included, implement it as a separate use case because it changes which demand the asset can fulfill.
- **Lifecycle rules:** Validate a same-tenant active target equipment type and prevent silent changes while the asset has unreleased commitments.
- **Dependencies:** Rental Commitment asset-commitment inquiry and candidate projection consumer.
- **Side effects:** If implemented, emit an idempotent asset-equipment-type-changed event after successful persistence.
- **Acceptance criteria:** The scope decision is recorded; if included, free assets can move to a valid active type, constrained or invalid changes are rejected, and the candidate equipment type is synchronized.
- **Suggested tests:** Decision-dependent domain and E2E tests for free, committed, inactive-type, missing-type, and cross-tenant cases.

#### [ ] Synchronize all asset changes and verify the workflow end to end

- **Priority:** P0
- **Expected behavior:** Consume every assignment-relevant asset event idempotently in Rental Commitment and verify the complete maintenance workflow through public HTTP and module boundaries.
- **Lifecycle rules:** Projection data remains derived and must not rewrite assigned references, asset blocks, confirmed assignments, or owner-split snapshots. Critical assignment paths must not treat a potentially stale projection as authoritative.
- **Dependencies:** All preceding asset mutation use cases and their projection consumers.
- **Side effects:** Update only the Rental Commitment candidate projection.
- **Acceptance criteria:** Candidate status, branch, equipment type, and ownership follow successful changes; duplicate event delivery is harmless; historical facts remain unchanged.
- **Reliability note:** Existing projection handlers log and swallow failures. Durable delivery, retries, or reconciliation must be addressed separately if guaranteed synchronization is required.
- **Suggested tests:** Event idempotency tests plus E2E metadata, status, branch, ownership, lifecycle, blocked-asset, tenant-isolation, and historical-snapshot scenarios.

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
