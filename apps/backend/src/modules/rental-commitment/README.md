# Rental Commitment Module

## Purpose

Rental Commitment owns rental orders as commercial and operational commitments.

It turns a customer or staff request into a rental commitment by preserving what was selected, what operational equipment demand was created, which assets were assigned, which assets were blocked, which price was accepted, which accessories were prepared, which delivery or pickup facts apply, and which owner split facts were snapshotted.

This is the core domain of the system. If this module is wrong, the system may double-book assets, lose accepted prices, forget what the customer selected, assign invalid equipment, lose accessory decisions, or calculate owner payouts from stale current data.

Public API: `rental-commitment.public-api.ts`

## Owns

```text
Rental orders
Rental lifecycle
Rental period snapshot
Selected branch/location reference
Tenant customer reference/snapshot when needed
Rental selections
Rental demand lines
Assigned equipment asset references
Rental-created asset blocks
Rental asset candidate projection
Rental availability read models
Confirmed price snapshots
Rental fulfillment method
Rental delivery details
Accessory preparation decisions
Rental accessory selections
Rental accessory asset assignments
Accessory asset blocks
Preparation state
Owner split snapshots
Rental cancellation rules
Rental edit rules
Rental fulfillment state
```

Examples of questions owned by Rental Commitment:

```text
Can this rental be created as pending?
Can this rental be created as draft?
Can this rental be confirmed?
What did the customer or staff select?
What operational equipment demand was created by those selections?
Which assets were assigned to satisfy that demand?
Which assets are blocked for the rental period?
What price was accepted at confirmation?
Can this confirmed rental be edited?
Should asset blocks be released?
Is this rental pickup or delivery?
What delivery details were accepted for this rental?
Which accessories were selected during preparation?
Which accessory assets were assigned and blocked?
What owner split facts were snapshotted at confirmation?
```

Rental Commitment owns accepted rental facts, not the current definitions from other modules.

## Does Not Own

```text
Current catalog definitions
Current rentable item images
Current rental offer visibility
Current rental offer rentability
Current fulfillment requirement definitions
Current physical asset metadata
Current asset ownership metadata
Current asset condition
Current asset location
Current pricing rules
Current rate plans
Current promotions
Current coupons
Tenant permissions
Tenant configuration
Branch schedules
Contract document generation
Signing request state
Signature acceptance records
Signed document artifacts
Notification delivery
```

Rental Commitment may store references, snapshots, and projections from other modules, but it does not become the authority over the original source data.

Contracts may use confirmed/prepared rental facts to generate legal documents, but Contracts owns generated documents, signing sessions, signature acceptance, signed artifacts, and contract signing status.

## Dependencies

Rental Commitment coordinates with several modules because confirming a rental is a cross-domain decision.

Rental Commitment may depend on Tenant Management for tenant, user, permission, branch, schedule, timezone, product mode, and configuration validation.

Rental Commitment may depend on Rental Catalog to resolve selected rental offers, rentable item snapshots, and fulfillment requirements.

Rental Commitment may depend on Pricing to calculate or validate the proposed rental price and return a structured price breakdown.

Rental Commitment may depend on Asset Inventory for current equipment type and asset facts, assignment eligibility, branch/location validation for assets, current ownership data, and accessory default data when preparing rentals.

Rental Commitment may consume Asset Inventory events or explicit sync results to maintain its rental asset candidate projection.

Rental Commitment may publish events that Contracts or Notifications react to.

Rental Commitment should not depend on Contracts or Notifications for its core confirmation, assignment, blocking, price snapshot, delivery, accessory preparation, or owner split decisions.

## Key Domain Concepts

### Rental

A rental is a tenant-scoped order/request/commitment for a selected rental period, branch/location, customer, and selected rentable items.

A rental can start as a draft or pending order and later become confirmed.

A confirmed rental is an accepted operational commitment. Confirmed means reserved and operationally committed. It does not necessarily mean picked up, delivered, completed, or legally locked.

### Rental Status

Rental status represents the operational lifecycle of the rental.

Typical lifecycle meanings:

```text
DRAFT
  Staff-created proposal or budget.
  Does not block assets until confirmed.

PENDING
  Customer-created request requiring tenant review.
  Does not block assets until confirmed.

CONFIRMED
  Accepted rental commitment.
  Equipment assets must be assigned and blocked.

PREPARED
  Confirmed rental whose accessory decisions or preparation details were reviewed.

PICKED_UP / DELIVERED
  Rental has entered fulfillment.

RETURNED / COMPLETED
  Rental has been returned and closed.

CANCELLED
  Rental was cancelled.
  Related active blocks should be released according to cancellation rules.
```

### Rental Selection

A rental selection is the commercial truth of what the customer or staff selected.

It snapshots the selected rental offer and rentable item information.

Example:

```text
RentalSelection
  selected: Filming Kit x 1
```

For a package, the package selection remains visible as the thing that was selected.

Rental selections must not be reconstructed from current Rental Catalog definitions for historical display or contract generation.

### Rental Demand Line

A rental demand line is the operational truth produced by a rental selection.

It describes the equipment type and quantity required to fulfill the selected item.

Example:

```text
RentalSelection: Filming Kit x 1
  RentalDemandLine: Sony FX3 x 1
  RentalDemandLine: Tripod x 1
  RentalDemandLine: LED Panel x 2
```

Demand lines belong to the selection that produced them.

The package parent is the `RentalSelection`, not the first demand line.

Demand lines are rental-owned operational demand snapshots, not catalog items.

### Rental Asset Candidate

A rental asset candidate is a Rental Commitment-owned projection of an asset that may be considered for assignment to a rental demand line or accessory selection.

It exists because Rental Commitment owns rental assignment decisions and all rental-related asset blocks.

Asset Inventory owns the physical asset profile. Rental Commitment owns the local projection needed to evaluate rental availability and assignment against its own block table.

A rental asset candidate may copy current assignment-relevant facts from Asset Inventory, such as:

```text
assetId
equipmentTypeId
tenantId
branchId
active/inactive state
condition or eligibility state
ownership reference when needed for assignment planning
```

The projection is derived data and must not become the source of truth for asset name, serial number, ownership, condition, branch, or metadata.

For critical command paths, Rental Commitment may still validate current asset facts through Asset Inventory public capabilities before confirming assignments.

### Assigned Asset Reference

An assigned asset reference records which physical asset was selected to satisfy a rental demand line.

The assigned asset reference stores the rental-owned assignment fact.

Asset Inventory owns the current physical asset profile.

If ownership or payout history matters, Rental Commitment must preserve owner split snapshots and must not rely only on live Asset Inventory data later.

### Asset Block

An asset block is the rental-owned commitment that prevents the same asset from being committed to overlapping rentals.

Asset blocks belong to Rental Commitment.

This includes both:

```text
Equipment asset blocks
Accessory asset blocks
```

Other modules must not write asset blocks directly.

### Confirmed Price Snapshot

The confirmed price snapshot is the accepted price result for a specific rental.

Pricing calculates price breakdowns, but Rental Commitment owns the accepted snapshot after confirmation.

This snapshot must preserve enough information to explain what was accepted even if rate plans, tiers, promotions, coupons, or tenant settings change later.

### Fulfillment Method and Delivery Details

The fulfillment method records whether the rental is handled by pickup or delivery.

```text
PICKUP
  The customer picks up or returns equipment through a tenant branch.

DELIVERY
  The tenant delivers equipment to a customer-provided address.
```

Rental delivery details preserve the delivery address and contact facts accepted for a specific rental.

If delivery fees exist, the accepted fee belongs in the confirmed price snapshot, not only in delivery details.

### Accessory Selection and Assignment

A rental accessory selection is the rental-specific decision to include an accessory equipment type and quantity during preparation.

Accessory defaults from Asset Inventory may suggest accessories, but Rental Commitment owns the actual rental-specific accessory selections.

Accessory selections may be linked to a source rental demand line. If `sourceRentalDemandLineId` is absent, the accessory should be displayed as a general/additional accessory for the rental.

A rental accessory asset assignment records which physical accessory asset was selected to satisfy a rental accessory selection.

Rental Commitment owns the assignment and the resulting accessory asset block.

### Owner Split Snapshot

An owner split snapshot preserves the financial ownership or payout facts accepted for a confirmed rental.

Asset Inventory may own current asset ownership, but current ownership can change.

If a rental involves third-party-owned assets and owner payouts, Rental Commitment must snapshot the owner split facts at confirmation or at the point where the payout becomes committed.

## Lifecycle / State Rules

```text
Pending rentals do not block assets.
Draft rentals do not block assets until confirmed.
Confirmed rentals must have assigned and blocked required equipment assets.
Confirming a rental must preserve selected commercial facts, expanded demand facts, assigned asset references, asset blocks, and accepted price snapshot consistently.
Editing a confirmed rental must revalidate affected facts when the edit changes period, branch, items, quantities, assignments, price, fulfillment method, delivery details, or blocks.
Cancelling a rental should release active rental-owned blocks according to cancellation rules.
Accessory preparation may create accessory selections, accessory asset assignments, and accessory blocks.
Contract signing does not automatically make a rental immutable.
If a rental changes after contract generation or signing, Contracts may require re-signing, but Rental Commitment still owns the rental edit rules.
```

Confirmation should be atomic. The system must not leave a rental partially confirmed.

## Persistence Ownership

Rental Commitment owns tables related to:

```text
rentals
rental selections
rental demand lines
rental asset candidates
assigned equipment asset references
asset blocks
confirmed price snapshots
rental delivery details
rental accessory selections
rental accessory asset assignments
accessory asset blocks
owner split snapshots
rental lifecycle state
```

Likely owned table concepts:

```text
v2_rentals
v2_rental_selections
v2_rental_demand_lines
v2_rental_asset_candidates
v2_assigned_asset_references
v2_asset_blocks
v2_confirmed_rental_price_snapshots
v2_rental_delivery_details
v2_rental_accessory_selections
rental_accessory_asset_assignments
v2_rental_owner_splits
```

`V2RentalAssetCandidate` is a local projection/read model. It is owned by Rental Commitment because it supports rental assignment and blocking decisions. The source asset record remains owned by Asset Inventory.

Examples of external references:

```text
RentalSelection may reference rentalOfferId from Rental Catalog.
RentalSelection may snapshot rentable item data from Rental Catalog.
RentalDemandLine may reference equipmentTypeId from Asset Inventory.
RentalAssetCandidate may project asset facts from Asset Inventory.
AssignedAssetReference may reference assetId from Asset Inventory.
AssetBlock may reference assetId from Asset Inventory.
Rental may reference branchId from Tenant Management.
ConfirmedPriceSnapshot may contain results produced by Pricing.
Contracts may reference rentalId when generating contract documents.
```

## Important Invariants

A confirmed rental must preserve the commercial selection that was accepted.

A confirmed rental must preserve the operational demand that was accepted.

`RentalSelection` is the commercial truth.

`RentalDemandLine` is the operational truth.

A package parent must be represented by `RentalSelection`, not by the first demand line.

Demand lines must remain linked to the selection that produced them.

Confirmed rentals must not depend on current Catalog definitions to reconstruct what was selected.

Confirmed rentals must not depend on current Pricing rules to reconstruct what price was accepted.

Confirmed rentals must not depend on current Asset Inventory ownership data to reconstruct committed owner payout facts.

A confirmed rental must not exist without required equipment asset blocks.

An asset block must not exist without a related rental-owned reason.

The same physical asset must not be blocked for overlapping rental periods.

Confirming a rental must not partially assign or block only some required assets.

Asset blocks belong to Rental Commitment, not Asset Inventory.

`RentalAssetCandidate` is a projection, not the source physical asset record.

The candidate projection must be updated through explicit sync paths, public APIs, or events from Asset Inventory.

Projection updates must be idempotent.

A stale candidate projection must not be used to bypass critical Asset Inventory validation when confirming a rental.

Rental asset candidates must not be treated as historical assignment facts.

Accessory defaults are not accessory selections.

Accessory selections are rental-specific.

Accessory assignment is optional unless the domain explicitly introduces mandatory accessory rules.

Assigned asset ownership must not be defaulted to tenant-owned during reconstitution if third-party ownership matters.

Owner split snapshots must survive later owner changes, asset ownership changes, and owner contract changes.

Delivery details belong to the rental when delivery is selected.

Delivery fees, if accepted, belong in the confirmed price snapshot.

Contract signing state must not be stored as rental lifecycle state.

A signed contract does not automatically make the rental immutable.

## Events / Side Effects

Possible emitted event categories include:

```text
Rental created
Pending rental created
Draft rental created
Rental confirmed
Confirmed rental edited
Rental cancelled
Asset blocks created
Asset blocks released
Preparation started
Accessories selected
Accessory assets assigned
Rental prepared
Rental picked up
Rental delivered
Rental returned
Rental completed
Owner splits snapshotted
```

Contracts may react to rental confirmation, preparation, or confirmed-rental edits.

Notifications may react to rental confirmation or later operational events.

Rental Commitment may consume Asset Inventory events to maintain its rental asset candidate projection.

Possible consumed event categories include:

```text
Asset created
Asset updated
Asset activated/deactivated
Asset condition changed
Asset branch changed
Asset ownership changed
Asset equipment type changed, if supported
```

Handlers that update rental asset candidates should be idempotent.

The event handler should update only the Rental Commitment projection. It must not mutate Asset Inventory records.

## Common Mistakes

Do not store only expanded equipment lines and lose the selected package relationship.

Do not treat the first demand line as the parent of a package.

Do not re-resolve current Catalog definitions to display historical confirmed rental selections.

Do not recalculate confirmed rental prices from current Pricing rules.

Do not query Pricing tables directly to reconstruct accepted prices.

Do not mutate Asset Inventory asset metadata when assigning assets.

Do not put asset blocks in Asset Inventory.

Do not let Asset Inventory write, release, or query asset blocks for business decisions.

Do not treat assigned asset references as full physical asset profiles.

Do not treat `RentalAssetCandidate` as the source of truth for asset metadata.

Do not update Asset Inventory through the Rental Commitment candidate projection.

Do not store confirmed assignment history only in `RentalAssetCandidate`.

Do not calculate historical owner payouts from current candidate data.

Do not assume the candidate projection is always perfectly fresh.

Do not default missing third-party ownership data to tenant-owned during aggregate reconstitution.

Do not treat accessory defaults as rental accessory selections.

Do not create accessory asset assignments without a rental accessory selection.

Do not create accessory blocks outside Rental Commitment.

Do not store delivery fee only in delivery details if it affects accepted customer price.

Do not store contract signing status as rental status.

Do not make a signed contract automatically lock rental editing unless an explicit Rental Commitment rule is introduced.

Do not let notification failure roll back rental confirmation.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/catalog/README.md
apps/backend/src/modules/asset-inventory/README.md
apps/backend/src/modules/pricing/README.md
apps/backend/src/modules/contracts/README.md
rental-commitment.public-api.ts
```
