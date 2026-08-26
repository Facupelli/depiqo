# Rental Commitment Module

Rental Commitment owns rental orders as commercial and operational commitments.

It preserves what was selected, the operational equipment demand produced by those selections, assigned and blocked assets, the accepted price, fulfillment and delivery facts, rental-specific accessory decisions, and historical owner split facts.

Confirmed rentals own accepted historical facts rather than depending on the current definitions of other modules.

Published capabilities: `rental-lifecycle-facts.public-api.ts`, `committed-rental-selections-and-demand.public-api.ts`, `rental-physical-assignments.public-api.ts`, and `accepted-rental-pricing-facts.public-api.ts`. Published lifecycle Integration Events are `RentalConfirmedIntegrationEvent`, `ConfirmedRentalEditedIntegrationEvent`, and `RentalCancelledIntegrationEvent`.

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

### Assigned Asset

An `AssignedAsset` is a temporal, rental-owned fulfillment participation recording when one physical asset fulfills a rental demand line.

`effectiveFrom` is the instant when the asset begins fulfilling the demand. `effectiveUntil` is the instant when it stops; a null `effectiveUntil` means the assignment is current/open. Closed assignments are preserved as rental history, while current fulfillment counts only open assignments.

Each assignment preserves the ownership and owner-contract payout terms accepted for that participation. Tenant-owned assignments record only that ownership kind. Third-party assignments preserve the owner, contract, payout basis, and owner share, so their history does not depend on later Asset Inventory ownership or owner-contract changes. This snapshot stores payout terms, not a calculated payout amount.

Each current assignment is paired with exactly one active rental-owned equipment Asset Block for `[effectiveFrom, rental period end)`. Historical assignments do not require an active block.

A confirmed rental's current assigned equipment asset may be replaced before or during its rental period. Before the period starts, replacement changes the future plan: the replaced assignment and its active block are removed because they never became effective. During the period, replacement preserves the previous assignment and block as history by closing both at the replacement effective time, then creates the replacement assignment and block from that instant through the rental end. Replacement availability is evaluated only for that remaining effective interval. Replacement does not change customer pricing. Current owner-split projection is recalculated from current/open assignments and the accepted price, while closed assignments retain their original ownership and contract terms. This does not create time-prorated owner payouts.

A confirmed rental may also add a new commercial selection before or during its rental period. Adding is strictly additive: existing selections, demand lines, assignments, assignment history, and blocks are preserved and existing assignments are never replanned. Physical availability for only the new demand is evaluated over `[effectiveAt, rentalEnd)`, where `effectiveAt` is the later of the rental start and the operation time. New assignments and blocks begin at that same instant. Customer pricing is recalculated for the complete resulting commercial rental over the original rental period, not only the remaining physical interval. Because the commercial composition changed, any previous manual price adjustment is cleared and current standard pricing is accepted. Current owner splits are then recalculated from the resulting accepted price and current/open assignments.

A confirmed selection quantity may change before or during the rental period. Its per-unit fulfillment multiplier is derived from the accepted persisted selection and demand quantities rather than current Catalog requirements. An increase allocates only the additional demand over the remaining effective interval, while existing assignments and blocks are never replanned. A decrease releases explicitly selected physical assets with an exact per-demand-line distribution. Before participation starts, released future assignments and blocks are removed; after participation starts, they are closed and truncated at one operation time while preserving assignment, block, creation, and ownership history. Customer pricing is recalculated at standard pricing for the complete original commercial period, any manual adjustment is cleared, and current owner splits are recalculated from open assignments. The existing confirmed-edited event invalidates existing contract state through the Contracts reaction.

A non-final confirmed rental selection may be removed before or during the rental period. The selection and its demand lines remain as historical tombstones, while current views and public product reads exclude them. Before the rental starts, their planned assignments and blocks are dropped. During the rental, all their open assignments and blocks are closed at one operation time, preserving physical history. Unrelated assignments are not replanned. The complete remaining rental is repriced over the original period without carrying a manual adjustment, and owner splits are recalculated from current selections, demand, and open assignments. The same offer may later be added with new selection and demand IDs. Removal emits the existing confirmed-edited event that invalidates Contracts and is rejected while a current accessory selection references target demand.

Assignment history is not pickup or return tracking. Rental Commitment does not claim that these timestamps represent actual physical possession, pickup, delivery, or return times. Asset Inventory remains authoritative over the asset's current physical profile.

### Asset Block

An asset block prevents a physical asset from being committed to overlapping rentals.

All rental-related asset blocks belong to Rental Commitment, including equipment and accessory blocks.

Other modules must not create or mutate them directly.

### Confirmed Price Snapshot

The confirmed price snapshot is the accepted pricing result for a rental.

Pricing calculates proposed price breakdowns. Rental Commitment translates a proposed calculation at its application boundary and owns the accepted durable snapshot once the rental is confirmed, including its schema identifier, versioning, lifecycle context, manual-adjustment actor/reason audit metadata, validation, and historical decoding.

The snapshot must preserve enough information to explain the accepted price after rate plans, promotions, coupons, or tenant settings change. Version 2 keeps calculated and final equipment totals separate from persisted insurance facts: `final.total` is the accepted equipment total, while the snapshot root `total` is the customer accepted total including insurance. Manual target-total adjustments apply only to equipment pricing and preserve the accepted insurance rate and amount.

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

When third-party ownership affects payout or audit history, Rental Commitment preserves the accepted terms on the assignment. `V2RentalOwnerSplit` remains the current calculated payout projection for current/open assignments and the current accepted price. Closed assignment history is not yet used for time-based or prorated payout calculation.

## Lifecycle

Implemented rental lifecycle statuses:

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
  This status does not imply that physical pickup or delivery has been
  separately tracked.

CANCELLED
  Rental was cancelled.
  Active rental blocks are released according to cancellation rules.

COMPLETED
  Terminal state reserved for closed rentals.
```

There is no separate preparation, pickup, delivery, or returned lifecycle status in the implemented model. Physical fulfillment progress is not tracked through rental statuses.

Confirmation must be atomic. A rental must not be left partially confirmed.

Confirming a rental must consistently preserve its selections, expanded demand, assignments, asset blocks, and accepted price snapshot.

Confirmed rental changes use focused operations where implemented, including detail edits, additive selection, temporal asset replacement, and period changes. Confirmed rental details may change before or during the active period. Once the rental starts, fulfillment method and delivery details are immutable, while notes, insurance selection, and manual pricing remain editable until the period ends. A manual pricing adjustment object applies target-total pricing; null removes an existing manual adjustment and restores standard pricing. Detail edits never replan selections, demand, assigned assets, blocks, accessories, or their history. Successful detail edits emit the existing confirmed-edited event, which invalidates existing Contracts state. The focused period operation is the preferred period-edit path. Before a confirmed rental starts, both start and end may change; after it starts, its original start is immutable and only its end may change. Ended rentals cannot be revived. Extensions retain the existing assets and check only the added interval after start, while shortening performs no availability check. Existing assets are never replanned. Current assignment participation is preserved and active equipment and accessory blocks follow the new period end, with planned assignment starts moving when a pre-start rental start moves. The complete commercial period is repriced from persisted accepted commercial facts, prior manual pricing adjustments are cleared, and owner splits are recalculated without time proration. The resulting confirmed-edited event invalidates Contracts through its existing reaction. Confirmed rentals mutate only through focused operations: detail edits, additive selection, selection removal, quantity changes, asset replacement, and period changes. Clients compose these focused commands sequentially; there is no bundled multi-domain confirmed-edit endpoint. A confirmed rental's branch is immutable after confirmation; branch changes are not supported. Unconfirmed (draft and pending) editing remains a separate broad rewrite path.

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

A confirmed rental must have all required equipment demand fulfilled by current/open assignments, each paired with its active equipment block.

The same physical asset must not be blocked for overlapping rental periods.

An asset block must have a rental-owned reason.

Confirmation must not partially assign or block only some required assets.

`RentalAssetCandidate` is a projection, not a historical assignment record or physical asset source of truth.

Candidate projection updates must happen through explicit synchronization, public APIs, or Asset Inventory events and must be idempotent.

A stale candidate projection must not bypass required current Asset Inventory validation during critical confirmation paths.

Assigned assets must not be treated as complete physical asset profiles. Their closed temporal rows are preserved, but only open rows count toward current fulfillment.

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

`RentalLifecycleFacts` publishes current Rental Commitment identity and lifecycle state: rental, branch, and Rental Customer references; current status; and rental period. It publishes stable Rental Commitment literals and no Tenant, Branch, or Customer profile data.

`CommittedRentalSelectionsAndDemand` publishes accepted Rental-owned commercial selections and derived operational demand. Selections retain their offer and rentable-item references, accepted item name/kind snapshots, and quantities. Demand lines retain their source selection relationship, equipment-type references, accepted Equipment Type name snapshots, and quantities. It does not refresh those names from Catalog or Asset Inventory and does not currently publish accessory selections.

Rental Commitment owns the confirmed price snapshot and must not query Pricing tables later to reconstruct an accepted price. Runtime accepts only the current snapshot version produced by normal pricing flows or the legacy-to-V2 migration. Its `AcceptedRentalPricingFacts` capability publishes only the insurance-inclusive customer accepted total money, charged units, and an optional common billing unit from that persisted snapshot. Consumers must not use it to recalculate pricing or depend on Pricing internals.

`RentalPhysicalAssignments` publishes only the current/open Rental Commitment assignment relationship between each demand line or accessory selection and its ordered assigned Asset references. It does not publish closed assignment history. It publishes neither demand presentation facts nor Asset Inventory profile facts. Consumers resolve current physical display facts, such as serial numbers, through Asset Inventory's display-facts capability.

Asset Inventory owns equipment types and the current physical profile, condition, ownership, location, and assignment-relevant facts of assets.

Rental Commitment owns rental-specific assignment decisions, assigned asset references, rental availability projections, and all rental-created asset blocks.

Rental Commitment may consume Asset Inventory changes to maintain its candidate projection but must never use that projection to mutate Asset Inventory.

Tenant Management owns tenants, permissions, branches, schedules, timezones, product mode, and tenant configuration.

Contracts owns contract generation, signing requests, signature acceptance, artifacts, and signing status.

Contracts may consume confirmed rental facts, but Rental Commitment does not depend on Contracts for confirmation, assignment, blocking, pricing snapshots, delivery, accessory preparation, or owner split decisions.

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

Rental Commitment may emit events for meaningful rental lifecycle and commitment changes, including confirmation, editing, cancellation, block creation/release, preparation, fulfillment, completion, and owner split snapshotting. Adding a confirmed selection emits the existing confirmed-rental-edited event, so generated or pending contracts become stale/draft and signed contracts require re-signing through the existing Contracts reaction.

Contracts and Notifications may react to appropriate rental events. The version 2 confirmed and confirmed-edited lifecycle Integration Events publish the transition-time customer reference, branch, `CONFIRMED` status, fulfillment method, and rental period. The version 2 cancellation event publishes its transition-time customer reference. Notifications resolves current tenant identity, customer contact state, and effective branch timezone from Tenant Management; it does not read Rental Commitment after these lifecycle events.

Rental Commitment may consume Asset Inventory asset changes to maintain its candidate projection.

Projection handlers must be idempotent and may update only Rental Commitment's derived projection, never Asset Inventory records.

## References

- `rental-lifecycle-facts.public-api.ts`
- `committed-rental-selections-and-demand.public-api.ts`
- `accepted-rental-pricing-facts.public-api.ts`
- `rental-physical-assignments.public-api.ts`
- `public-api/events/rental-lifecycle.integration-events.ts`
- `apps/backend/docs/architecture/overview.md`
- `apps/backend/docs/architecture/adr/`
- `apps/backend/src/modules/tenant-management/README.md`
- `apps/backend/src/modules/catalog/README.md`
- `apps/backend/src/modules/asset-inventory/README.md`
- `apps/backend/src/modules/pricing/README.md`
- `apps/backend/src/modules/contracts/README.md`
