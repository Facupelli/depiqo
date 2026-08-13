# Rental Commitment Module

Rental Commitment owns rental orders as commercial and operational commitments.

It preserves what was selected, the operational equipment demand produced by those selections, assigned and blocked assets, the accepted price, fulfillment and delivery facts, rental-specific accessory decisions, and historical owner split facts.

Confirmed rentals own accepted historical facts rather than depending on the current definitions of other modules.

Public API: `rental-commitment.public-api.ts`

## Domain Concepts

### Rental

A `Rental` is a tenant-scoped order or commitment for a rental period, branch, customer, and set of selected rentable items.

A rental may begin as draft or pending and later become confirmed.

A confirmed rental is an accepted operational commitment. It does not necessarily mean the rental has been picked up, delivered, completed, or legally locked.

### Rental Selection

A `RentalSelection` is the commercial truth of what the customer or staff selected.

It snapshots the selected rental offer and rentable item information.

For packages, the package selection remains the commercial parent:

```text
RentalSelection: Filming Kit x 1
```

Confirmed rental selections must not be reconstructed later from current Rental Catalog definitions.

### Rental Demand Line

A `RentalDemandLine` is the operational equipment demand produced by a rental selection.

```text
RentalSelection: Filming Kit x 1
  RentalDemandLine: Sony FX3 x 1
  RentalDemandLine: Tripod x 1
  RentalDemandLine: LED Panel x 2
```

Demand lines remain linked to the selection that produced them.

The package parent is the `RentalSelection`, not the first demand line.

Demand lines are rental-owned operational snapshots, not catalog items.

### Rental Asset Candidate

A `RentalAssetCandidate` is a Rental Commitment-owned projection of a physical asset that may be considered for assignment.

It exists so Rental Commitment can evaluate availability against the asset blocks it owns.

The projection may contain current assignment-relevant facts from Asset Inventory, including:

```text
assetId
equipmentTypeId
tenantId
branchId
active state
condition or eligibility state
ownership reference when needed
```

It is derived data, not the source of truth for the physical asset.

For critical command paths, current asset facts may still need to be validated through Asset Inventory before an assignment is confirmed.

### Assigned Asset Reference

An assigned asset reference records which physical asset was selected to satisfy rental demand.

It preserves the rental-owned assignment fact while Asset Inventory remains authoritative over the asset's current physical profile.

### Asset Block

An asset block prevents a physical asset from being committed to overlapping rentals.

All rental-related asset blocks belong to Rental Commitment, including equipment and accessory blocks.

Other modules must not create or mutate them directly.

### Confirmed Price Snapshot

The confirmed price snapshot is the accepted pricing result for a rental.

Pricing calculates proposed price breakdowns. Rental Commitment translates a proposed calculation at its application boundary and owns the accepted durable snapshot once the rental is confirmed, including its schema identifier, versioning, lifecycle context, manual-adjustment actor/reason audit metadata, validation, and historical decoding.

The snapshot must preserve enough information to explain the accepted price after rate plans, promotions, coupons, or tenant settings change.

### Fulfillment Method and Delivery Details

A rental may use:

```text
PICKUP
  Customer picks up or returns equipment through a tenant branch.

DELIVERY
  Tenant delivers equipment to a customer-provided address.
```

Rental delivery details preserve the accepted delivery address and contact facts.

If a delivery fee affects the accepted customer price, it also belongs in the confirmed price snapshot.

### Accessory Selection and Assignment

A rental accessory selection is the rental-specific decision to include an accessory equipment type and quantity during preparation.

Asset Inventory accessory defaults may suggest accessories, but they do not become rental selections automatically.

An accessory selection may reference the demand line that caused it. Without `sourceRentalDemandLineId`, it is treated as a general/additional rental accessory.

A rental accessory asset assignment records which physical asset fulfills that accessory selection.

Rental Commitment owns both the assignment and its resulting asset block.

### Owner Split Snapshot

An owner split snapshot preserves financial ownership or payout facts for a committed rental.

Asset Inventory owns current asset ownership, which may later change.

When third-party ownership affects payout or audit history, Rental Commitment preserves the relevant owner split facts at confirmation or when the payout becomes committed.

## Lifecycle

Typical rental lifecycle meanings:

```text
DRAFT
  Staff-created proposal or budget.
  Does not block assets.
  May use pickup and return times outside branch schedule windows; those windows
  are validated when a confirmed rental is created.

PENDING
  Customer-created request requiring tenant review.
  Does not block assets.

CONFIRMED
  Accepted operational commitment.
  Required equipment assets are assigned and blocked.

PREPARED
  Confirmed rental whose accessory or preparation decisions were reviewed.

PICKED_UP / DELIVERED
  Rental has entered fulfillment.

RETURNED / COMPLETED
  Rental has been returned and closed.

CANCELLED
  Rental was cancelled.
  Active rental blocks are released according to cancellation rules.
```

Confirmation must be atomic. A rental must not be left partially confirmed.

Confirming a rental must consistently preserve its selections, expanded demand, assignments, asset blocks, and accepted price snapshot.

Editing a confirmed rental must revalidate affected facts when changing period, branch, items, quantities, assignments, price, fulfillment method, delivery details, or blocks.

Accessory preparation may create rental accessory selections, accessory assignments, and accessory blocks.

Contract signing does not automatically make a rental immutable.

If changes after contract generation or signing require re-signing, Contracts owns that re-signing state while Rental Commitment continues to own whether the rental edit is allowed.

## Business Rules

`RentalSelection` is the commercial truth of what was accepted.

`RentalDemandLine` is the operational truth derived from that selection.

A confirmed rental must preserve both.

Confirmed rentals must not reconstruct selections from current Rental Catalog definitions.

Confirmed rentals must not reconstruct accepted prices from current Pricing rules.

Confirmed rentals must not reconstruct historical owner payout facts from current Asset Inventory ownership.

A confirmed rental must have all required equipment assets assigned and blocked.

The same physical asset must not be blocked for overlapping rental periods.

An asset block must have a rental-owned reason.

Confirmation must not partially assign or block only some required assets.

`RentalAssetCandidate` is a projection, not a historical assignment record or physical asset source of truth.

Candidate projection updates must happen through explicit synchronization, public APIs, or Asset Inventory events and must be idempotent.

A stale candidate projection must not bypass required current Asset Inventory validation during critical confirmation paths.

Assigned asset references must not be treated as complete physical asset profiles.

Accessory defaults are not rental accessory selections.

Accessory selections are rental-specific.

Accessory asset assignments require a rental accessory selection.

Accessory assignment is optional unless mandatory accessory rules are explicitly introduced.

Missing third-party ownership information must not be defaulted to tenant-owned when reconstructing historical rental state.

Owner split snapshots must survive later owner, asset ownership, or owner contract changes.

Contract signing state must not be stored as rental lifecycle state.

Notification failure must not roll back rental confirmation.

## Boundaries

Rental Catalog owns current rental offers, rentable items, presentation, and fulfillment requirement definitions.

Rental Commitment resolves those definitions when creating or changing a rental, then preserves the commercial selections and generated demand it accepts.

Pricing owns current pricing rules and proposed price calculations.

Rental Commitment owns the confirmed price snapshot and must not query Pricing tables later to reconstruct an accepted price.

Asset Inventory owns equipment types and the current physical profile, condition, ownership, location, and assignment-relevant facts of assets.

Rental Commitment owns rental-specific assignment decisions, assigned asset references, rental availability projections, and all rental-created asset blocks.

Rental Commitment may consume Asset Inventory changes to maintain its candidate projection but must never use that projection to mutate Asset Inventory.

Tenant Management owns tenants, permissions, branches, schedules, timezones, product mode, and tenant configuration.

Contracts owns contract generation, signing requests, signature acceptance, artifacts, and signing status.

Contracts may consume confirmed or prepared rental facts, but Rental Commitment does not depend on Contracts for confirmation, assignment, blocking, pricing snapshots, delivery, accessory preparation, or owner split decisions.

Notifications may react to rental events, but notification delivery is not part of rental truth.

## Persistence

Rental Commitment owns persistence for:

```text
rentals
rental selections
rental demand lines
rental asset candidate projection
assigned asset references
asset blocks
confirmed price snapshots
rental delivery details
rental accessory selections
rental accessory asset assignments
accessory asset blocks
owner split snapshots
rental lifecycle state
```

`V2RentalAssetCandidate` is a local projection/read model owned by Rental Commitment because it supports assignment and blocking decisions.

The underlying physical asset remains owned by Asset Inventory.

## Events / Side Effects

Rental Commitment may emit events for meaningful rental lifecycle and commitment changes, including confirmation, editing, cancellation, block creation/release, preparation, fulfillment, completion, and owner split snapshotting.

Contracts and Notifications may react to appropriate rental events.

Rental Commitment may consume Asset Inventory asset changes to maintain its candidate projection.

Projection handlers must be idempotent and may update only Rental Commitment's derived projection, never Asset Inventory records.

## References

* `rental-commitment.public-api.ts`
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`
* `apps/backend/src/modules/tenant-management/README.md`
* `apps/backend/src/modules/catalog/README.md`
* `apps/backend/src/modules/asset-inventory/README.md`
* `apps/backend/src/modules/pricing/README.md`
* `apps/backend/src/modules/contracts/README.md`
