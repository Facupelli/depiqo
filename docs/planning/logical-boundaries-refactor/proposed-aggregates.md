# Logical Boundaries Refactor - Proposed Aggregates

## Purpose

This document proposes where the redesigned rental system should use aggregates, entities, value objects, domain services, or simpler transaction-script style logic.

It is based on:

- `docs/ddd/`
- `docs/ddd/08a-use-case-command-modeling.md`
- `docs/planning/logical-boundaries-refactor/proposed-tables.md`

The goal is not to create aggregates for every table. Aggregates should be used where the system must protect business invariants, lifecycle transitions, or multi-record consistency.

---

## Aggregate design principle

Use an aggregate when a business operation must protect a consistency boundary through behavior.

Good reasons to create an aggregate in this system:

- a command changes multiple related records that must succeed or fail together;
- a lifecycle/status transition has business rules;
- an invariant spans multiple child records;
- invalid partial states would create real rental/business risk;
- the same rules would otherwise be duplicated across use cases or services.

Avoid rich aggregates for simple CRUD records where database constraints, value objects, or transaction-script style application logic are enough.

---

# Recommended aggregate map

## Core aggregate

```text
Rental Commitment
-----------------
Rental aggregate
  - RentalItem
  - RentalComboSnapshot
  - RentalComboSnapshotComponent
  - RentalEquipmentDemand
  - SelectedAccessory
  - AssignedAsset
  - AssetBlock
  - PriceSnapshot
  - RentalPeriod
```

The `Rental` aggregate is the central aggregate of the redesign.

It should cover Pending/Request creation, Draft creation, confirmation, confirmed-rental editing, preparation, cancellation, pickup/delivery, return/checking, and completion.

## Supporting aggregates or aggregate candidates

```text
Catalog
-------
Combo
EquipmentType, light aggregate/entity
AccessoryRule, simple entity/configuration for now

Asset Inventory
---------------
Asset, light aggregate
OwnerContract, possible future aggregate

Contracts
---------
Contract, separate aggregate candidate

Pricing
-------
Mostly rules, policies, value objects, and domain services

Notifications
-------------
Simple records/infrastructure for now
```

---

# 1. Rental aggregate

## Recommendation

Create a rich `Rental` aggregate root inside the Rental Commitment context.

```text
Aggregate root: Rental
```

The aggregate starts at Pending/Draft creation, not only at confirmation. Even a Pending Rental has important rules: it must preserve the request consistently and must not assign or block assets.

## Why this needs an aggregate

The use-case model shows that the main rental commands repeatedly modify the same consistency boundary:

- Create WhatsApp-style Pending Rental;
- Confirm Rental;
- Edit Confirmed Rental;
- Prepare Rental;
- Cancel Rental;
- later pickup/delivery/return/check/complete transitions.

These commands are not independent CRUD operations. They protect the rental commitment lifecycle.

A Confirmed Rental is valid only if several facts agree at the same time:

- the rental belongs to one tenant;
- the rental belongs to one real branch;
- the rental has one shared rental period;
- the rental has valid selected items;
- selected combos are preserved as selected combos;
- selected combos are expanded into equipment demand;
- the confirmed price snapshot is preserved;
- enough compatible assets are assigned;
- assigned equipment assets have active blocks for the full rental period;
- the rental status reflects the actual commitment state.

If these facts are updated independently, the system can end in dangerous partial states.

Examples:

- rental confirmed but assets were not blocked;
- assets blocked but rental was not confirmed;
- only some required assets were blocked;
- rental period changed but asset blocks still use the old period;
- equipment added but no asset was assigned for it;
- equipment removed but old assets remain blocked;
- price snapshot updated while items or period failed to update;
- selected accessories appear on a contract but were never assigned/blocked.

Because these rules span multiple child records, they should be protected by the `Rental` aggregate instead of scattered across use cases.

## Main invariants

The `Rental` aggregate should enforce:

- A Pending Rental belongs to one tenant.
- A Pending Rental belongs to one branch.
- A Pending Rental has one rental period.
- A Pending Rental contains at least one selected equipment type or selected combo.
- A Pending Rental must not assign assets.
- A Pending Rental must not block assets.
- A Draft Rental must not assign or block assets until confirmed.
- A Confirmed Rental must have enough active equipment assignments for its active equipment demands.
- A Confirmed Rental must have active equipment asset blocks covering the rental period.
- Selected combos must be preserved as selected combos, even when expanded into equipment demand.
- A selected combo cannot be partially fulfilled.
- Combo contents cannot be edited inside a Rental.
- Equipment demand from individual equipment and combos must be aggregated for assignment.
- Confirmation must atomically preserve status, price snapshot, equipment demands, assigned assets, and asset blocks.
- Availability-affecting confirmed rental edits must atomically update items, period, demands, assignments, blocks, and price.
- If an edited confirmed rental cannot be fully satisfied, the original confirmed rental should remain unchanged.
- Accessory assignment is optional.
- A Rental can be prepared with zero accessories.
- If accessories are selected, selected accessory quantities, assigned accessory assets, accessory blocks, and preparation state must remain consistent.
- Cancelled rentals must release active rental-related blocks.
- Completed and Cancelled rentals should be terminal for normal operations.

## Child concepts inside the aggregate

The following tables/concepts should be treated as part of the `Rental` consistency boundary:

```text
rentals
rental_items
rental_combo_snapshots
rental_combo_snapshot_components
rental_equipment_demands
selected_accessories
assigned_assets
asset_blocks
rental_owner_splits, if created as part of confirmation/assignment
```

Not every child needs heavy behavior. Some can be internal entities or value objects. The important rule is that external code should not modify these records directly in ways that bypass `Rental` behavior.

## Important commands/behaviors

The aggregate should expose behavior-oriented methods aligned with the use cases:

```text
createPendingRequest(...)
createDraft(...)
confirm(...)
editConfirmed(...)
cancel(...)
startPreparation(...)
reviewAccessories(...)
reserveSelectedAccessories(...)
markPrepared(...)
markPickedUp(...)
markDelivered(...)
markReturned(...)
markChecked(...)
complete(...)
releaseBlocks(...)
```

Application services may orchestrate calls to Catalog, Pricing, Tenant Management, and Asset Inventory. The final state change should happen through `Rental` behavior.

## Use-case alignment

### Create WhatsApp-style Pending Rental

This should be a `Rental.createPendingRequest(...)` behavior.

It creates the rental request and enforces that no asset assignment or blocking happens.

State created:

- Rental with Pending status;
- tenant reference;
- branch reference;
- rental period;
- rental customer contact/reference/snapshot;
- selected equipment type references/snapshots;
- selected combo references/snapshots;
- source/mode as WhatsApp-style;
- estimated/quoted price snapshot if shown.

No assigned assets or asset blocks are created.

### Confirm Rental

This should be a `Rental.confirm(...)` behavior.

The use case confirms that this is the strongest aggregate boundary.

Must succeed or fail together:

- validate current rental state;
- preserve selected items and combo snapshots;
- generate/replace equipment demands;
- preserve confirmed price snapshot;
- assign equipment assets;
- create equipment asset blocks;
- change status to Confirmed.

### Edit Confirmed Rental

This should be a `Rental.editConfirmed(...)` behavior.

If the edit affects period, equipment, combos, quantities, branch, or price, the rental must not end with disagreement between:

- selected items;
- rental period;
- selected branch;
- equipment demand;
- price snapshot;
- assigned assets;
- asset blocks.

### Prepare Rental

Preparation should stay inside the `Rental` aggregate for now.

This command modifies:

- preparation state;
- selected accessories;
- selected accessory quantities;
- assigned accessory assets;
- accessory asset blocks;
- Prepared status/state.

Accessories are optional, but selected accessories must be consistent with assignments and blocks.

## Lifecycle/state-transition logic

The rental lifecycle deserves explicit modeling because status transitions have business meaning.

Possible states:

```text
PENDING
DRAFT
CONFIRMED
PREPARING
PREPARED
PICKED_UP
DELIVERED
RETURNED
CHECKED
COMPLETED
CANCELLED
REJECTED
```

The exact status list can be simplified, but invalid transitions should be blocked.

Examples:

- Pending or Draft can become Confirmed.
- Pending can become Rejected.
- Confirmed can enter Preparation.
- Confirmed/Prepared can be Picked Up or Delivered.
- Picked Up/Delivered can be Returned.
- Returned can be Checked.
- Checked can be Completed.
- Cancelled and Completed should be terminal for normal operations.

## External dependencies

The `Rental` aggregate should not own all data used by the commands. Application services can prepare validated inputs from other contexts.

Examples:

- Tenant Management validates tenant, branch, permissions, schedules, slots, timezone, and product mode.
- Catalog validates equipment types, combos, visibility/rentability, combo contents, and accessory compatibility/defaults.
- Pricing calculates estimated, quoted, or confirmed price breakdowns.
- Asset Inventory provides eligible physical asset candidates.

But Rental Commitment owns the accepted commitment facts:

- selected rental items and snapshots;
- selected combo snapshots;
- expanded equipment demands;
- confirmed price snapshot;
- assigned asset references;
- rental-related asset blocks;
- preparation state;
- rental status.

---

# 2. AssetBlock as part of Rental, plus database protection

## Recommendation

Do not model rental-related `AssetBlock` as an independent aggregate root initially.

Instead:

```text
Rental owns rental-related AssetBlocks.
```

However, the no-overlap invariant must also be enforced by the database.

## Why this is not a separate aggregate root

An asset block created for a rental is meaningful only in relation to:

- the rental period;
- the rental status;
- the assigned asset;
- the equipment demand or selected accessory it satisfies.

During confirmation, confirmed-rental editing, cancellation, and preparation, blocks must change together with the rental. If blocks are updated independently, the system can create invalid commitments.

## Critical invariant

For the same physical asset, active blocks must not overlap.

Recommended PostgreSQL-style protection:

```text
exclude using gist (
  asset_id with =,
  period with &&
)
where released_at is null
```

This protects against race conditions and concurrent confirmations/edits.

Domain logic should express the rule, but the database must protect the final no-overlap guarantee.

---

# 3. Combo aggregate

## Recommendation

Create a `Combo` aggregate root in the Catalog context.

```text
Aggregate root: Combo
```

## Why this needs an aggregate

A Combo is an all-or-nothing catalog offer composed of multiple equipment types. Publishing or editing a combo involves rules across component rows.

The use-case model also confirms that selected combos must remain whole during rental confirmation and editing. Rental Commitment snapshots selected combos, but Catalog owns the current combo definition.

## Main invariants

The `Combo` aggregate should enforce:

- a published combo must have at least two valid components;
- each component quantity must be greater than zero;
- each component equipment type must allow `can_be_combo_component = true`;
- a component list should not contain duplicate equipment types;
- a combo may be visible/rentable per branch;
- editing the catalog combo must not mutate existing rental combo snapshots.

## Child concepts

```text
combos
combo_components
combo_branch_visibility
```

## Important behaviors

```text
addComponent(...)
removeComponent(...)
changeComponentQuantity(...)
publish(...)
retire(...)
setBranchVisibility(...)
```

## Boundary with Rental

Catalog owns the current combo definition.

Rental Commitment owns the selected combo snapshot and expanded rental equipment demand.

This means:

- changing a combo affects future rentals;
- changing a combo must not rewrite confirmed or historical rentals;
- selected combo contents should be snapshotted into the rental;
- a rental can add/remove selected combos, but cannot edit combo contents internally.

---

# 4. EquipmentType as light aggregate/entity

## Recommendation

Model `EquipmentType` as a light aggregate or rich entity only where capability/lifecycle rules justify it.

Many equipment type operations may remain CRUD-like.

## Rules to enforce

Important rules include:

- retired/deleted equipment types cannot be selected for new rentals;
- standalone rental items require `is_rentable_standalone = true`;
- combo components require `can_be_combo_component = true`;
- accessory rules require `can_be_accessory = true`;
- if `requires_asset_tracking = true`, fulfillment expects physical asset records;
- branch visibility is unique per tenant/equipment type/branch.

## Suggested value objects

```text
EquipmentTypeCapabilities
EquipmentTypeStatus
TrackingMode
```

## Why not over-model this first

The highest-risk logic is rental confirmation, editing, preparation, and blocking. Equipment type management can stay simpler until its own behavior becomes hard to test or starts accumulating complex state transitions.

---

# 5. Accessory rules

## Recommendation

Do not create a separate rich aggregate for accessory compatibility yet.

Represent accessory rules as Catalog-owned configuration with validation and database constraints.

## Rules to enforce

```text
primary_equipment_type_id != accessory_equipment_type_id
accessory_equipment_type.can_be_accessory = true
if is_default = true, default_quantity > 0
unique(tenant_id, primary_equipment_type_id, accessory_equipment_type_id)
```

## Why not an aggregate yet

Current accessory compatibility is mostly configuration.

The complex accessory behavior appears during Prepare Rental, where selected accessories are reviewed, assigned, blocked, or skipped. That belongs inside the `Rental` aggregate.

Accessory rules may deserve richer modeling later if the system adds:

- mandatory accessories;
- substitute accessories;
- branch-specific accessory defaults;
- accessory bundles;
- complex compatibility policies.

---

# 6. Asset aggregate

## Recommendation

Model `Asset` as a light aggregate in Asset Inventory.

```text
Aggregate root: Asset
```

## What Asset owns

`Asset` owns the physical truth of a rentable or trackable unit:

- tenant;
- branch;
- equipment type reference;
- owner;
- serial number;
- condition/status;
- active/inactive state;
- physical metadata.

## Rules to enforce

- An asset belongs to one tenant.
- An asset belongs to one branch.
- An asset references one equipment type.
- Inactive/deleted assets cannot be assignment candidates.
- Asset condition may prevent assignment.
- Third-party-owned assets may require a valid owner contract to be assignment candidates.

## Boundary with Rental Commitment

Asset Inventory should answer:

```text
Is this asset an eligible candidate ignoring rental blocks?
```

Rental Commitment should answer:

```text
Can this asset be assigned and blocked for this rental period?
```

Asset Inventory does not own rental asset blocks. Rental Commitment owns rental-related blocks.

---

# 7. OwnerContract as possible future aggregate

## Recommendation

Keep `OwnerContract` simple for now unless owner-contract behavior grows.

It may become an aggregate later.

## Rules to enforce

- Contract belongs to one tenant.
- Contract belongs to one owner.
- Contract may apply to all owner assets or to one specific asset.
- `valid_from` must be before `valid_to` when `valid_to` exists.
- owner/rental shares must be valid.
- confirmed rental owner splits should snapshot contract terms.

## Boundary with Rental

Owner contracts may influence asset eligibility and owner split calculations.

Confirmed rental splits should be snapshotted so future owner contract changes do not mutate past rentals.

---

# 8. Pricing model

## Recommendation

Pricing should be rule/policy/domain-service heavy, not aggregate-heavy at first.

Pricing owns calculation rules. Rental Commitment owns the accepted price snapshot.

## Why this should not be inside Rental

Pricing rules may include:

- pricing tiers;
- long-rental discounts;
- promotions;
- coupons;
- combo pricing rules;
- custom adjustments.

These rules can evolve independently from the rental lifecycle.

## Main invariant

A confirmed rental must preserve the accepted price snapshot.

That invariant belongs to the `Rental` aggregate.

Pricing should calculate:

```text
PriceBreakdown
```

Rental should preserve:

```text
PriceSnapshot
```

## Useful value objects

```text
Money
Percentage
RentalDuration
PriceBreakdown
CouponCode
Discount
CustomAdjustment
```

---

# 9. Contract aggregate candidate

## Recommendation

Contracts can have a separate `Contract` aggregate if document/signing lifecycle logic becomes non-trivial.

Do not put contract signing inside the `Rental` aggregate.

## Why this is separate from Rental

The Generate/Request Contract Signing use case reads stable Rental snapshots but does not own rental confirmation, rental assignment, asset blocking, or price calculation.

Contract state must not control Rental confirmation.

## Possible lifecycle

```text
GENERATED
SIGNING_REQUESTED
SIGNED
RE_SIGNING_REQUIRED
CANCELLED
```

## Rules

- Contract generation uses Rental snapshots, not live mutable Catalog/Pricing data.
- Contract generation/signing may require the Rental to be Confirmed or Prepared, depending on tenant rules.
- If accessories are required in the contract, the Rental should be Prepared before contract generation/signing.
- Contract signing does not automatically make the Rental immutable.
- If a Rental changes after contract generation/signing, Contracts may mark re-signing required.
- Contract state and Rental state are related but separate.

## Boundary with Rental

Contracts may read Rental Commitment details and react to events such as:

```text
RentalConfirmed
ConfirmedRentalEdited
RentalPrepared
```

But contract failure should not invalidate a successful rental confirmation unless a future tenant rule explicitly requires that.

---

# 10. Notifications

## Recommendation

Do not model Notifications as a rich aggregate initially.

Notifications are generic infrastructure.

## Rules

- Notification failure must not invalidate rental confirmation.
- Automatic WhatsApp notification infrastructure is out of scope for the lightweight flow.
- The WhatsApp-style flow generates a message for the customer to send manually; that is not a Notification aggregate.

Simple records are enough for now:

```text
notifications
notification_templates
notification_deliveries
```

---

# Where invariants are strongest

Prioritize aggregate modeling in these operations.

## 1. Create Pending Rental

Must consistently create the request and guarantee that no commitment is made yet.

Important rules:

- save tenant, branch, period, customer/contact, selected items, selected combos, source/mode, and quoted/estimated price if shown;
- do not assign assets;
- do not block assets;
- do not mark as Confirmed.

## 2. Confirm Rental

This is the strongest consistency boundary.

Must succeed or fail together:

- validate rental state;
- preserve selected items and combo snapshots;
- generate equipment demands;
- preserve confirmed price snapshot;
- assign equipment assets;
- create equipment asset blocks;
- change status to Confirmed.

## 3. Edit Confirmed Rental

Availability-affecting edits must be atomic.

Examples:

- rental period changes;
- equipment additions/removals;
- combo additions/removals;
- quantity changes;
- branch changes, if ever allowed;
- price-affecting changes.

The rental must not be left with stale assignments, stale blocks, stale equipment demand, or mismatched price.

## 4. Prepare Rental

Preparation has its own consistency boundary when accessories are selected.

Must keep consistent:

- preparation state;
- selected accessory quantities;
- assigned accessory assets;
- accessory asset blocks;
- Prepared state.

Accessories are optional, but selected accessories must be consistent.

## 5. Cancel Rental

Cancellation should consistently:

- change rental status;
- release active rental-related blocks;
- preserve history of previous assignments/blocks if needed.

## 6. Publish Combo

Publishing a combo should enforce:

- enough components;
- valid component quantities;
- valid component equipment types;
- no duplicate components.

## 7. Asset blocking

The same physical asset must not have overlapping active blocks.

This must be enforced by domain logic and database constraints.

---

# Where simpler logic is enough

These areas probably do not need rich aggregates at first:

```text
equipment_categories
equipment_type_branch_visibility
combo_branch_visibility
asset_owners
notifications
notification_templates
notification_deliveries
tenant users
roles
permissions
branch schedules
basic contract template management
```

Use database constraints, value objects, and application services where appropriate.

Do not create aggregates unless behavior and invariants justify them.

---

# Implementation priority

If only one aggregate is implemented deeply first, it should be:

```text
Rental
```

Reason:

This aggregate protects the system from the worst business failures:

- double-booking physical assets;
- confirming rentals without blocked assets;
- assigning assets from the wrong branch;
- losing combo history after catalog edits;
- preserving the wrong confirmed price;
- losing selected accessory assignments;
- creating inconsistent rental lifecycle transitions.

Everything else can start simpler and evolve as business behavior becomes more complex.
