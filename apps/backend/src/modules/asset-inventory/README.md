# Asset Inventory Module

Asset Inventory owns the current physical truth about equipment: equipment types, physical assets, their condition, location, ownership, active state, and facts used to determine whether they can be considered for rental assignment.

It does not own rental assignments or rental availability state.

Public API: `asset-inventory.public-api.ts`

## Domain Concepts

### Equipment Type

An `EquipmentType` is the operational type or model used to group interchangeable physical assets.

It represents what kind of physical asset can satisfy a fulfillment requirement.

It is not the customer-selected catalog item. Rental Catalog owns `RentableItem` and `RentalOffer`.

### Asset

An `Asset` is an individual physical unit.

An asset belongs to one tenant and satisfies one equipment type. Its `serialNumber` is manufacturer reference data, not a tenant-wide application identifier, and may repeat.

Asset Inventory owns its current physical profile, including:

```text
equipment type
serial/reference data
condition
active state
branch/location reference
ownership
metadata
```

Rental Commitment may reference an asset by ID, but Asset Inventory remains authoritative over its current physical profile.

### Asset Ownership

Asset ownership describes who currently owns a physical asset.

An asset may be tenant-owned or third-party-owned. Third-party ownership metadata belongs to Asset Inventory.

Current ownership must not be used to reconstruct historical rental financial facts. When ownership affects payout or audit history, Rental Commitment preserves the required owner split snapshot at confirmation time.

### Equipment-Type Accessory Default

An equipment-type accessory default defines a suggested accessory relationship between two equipment types and its default quantity.

It is operational equipment configuration, not a catalog relationship.

Accessory defaults may be used when preparing rental-specific accessories, but they do not create assignments or blocks themselves.

## Business Rules

`EquipmentType` is an operational fulfillment type, not the customer-selectable rental item.

`Asset` is the physical unit, not the rental assignment.

Inactive or deleted assets must not be assigned to new rentals.

Inactive equipment types must not be used for new operational setup unless a workflow explicitly allows it for historical reads or migration.

Condition and branch/location changes affect future assignment eligibility.

Ownership changes affect current ownership facts, not historical rental owner split snapshots.

Assets may exist even when they are not currently rentable or assignable.

An asset must belong to the same tenant as its equipment type.

A branch referenced by an asset must belong to the same tenant.

An equipment type must not define itself as its own accessory default.

Accessory default quantities must be positive.

Accessory defaults are suggestions/configuration. They must not create rental-specific accessory selections, asset assignments, or asset blocks.

Do not treat accessory defaults as mandatory unless the domain explicitly introduces mandatory accessory rules.

Current asset metadata changes must not mutate confirmed rental snapshots.

Do not default missing historical assigned-asset ownership to tenant-owned during rental reconstitution. If historical ownership matters, it must be explicitly preserved.

Do not infer package contents from assets. Package fulfillment comes from Rental Catalog fulfillment requirements.

Do not reintroduce the old rental model where rental flows select raw equipment types or combos directly.

## Boundaries

Rental Commitment owns the decision to assign and block assets for a specific rental. Asset Inventory may validate current asset facts and assignment eligibility, but it does not own rental-created asset blocks.

Asset Inventory must not query Rental Commitment's asset blocks directly to determine availability.

Rental Commitment owns rental-specific accessory selections, accessory asset assignments, and accessory asset blocks.

Rental Commitment owns historical owner split snapshots for confirmed rentals. Asset Inventory owns current asset ownership.

Rental Catalog owns rentable catalog identity, offers, catalog presentation, and fulfillment requirements. Those requirements may reference an `equipmentTypeId`.

Tenant Management owns branches, including their active state, schedules, and timezone rules. Asset Inventory may reference a branch and validate that it belongs to the tenant.

Offering Setup may coordinate Asset Inventory with Rental Catalog and Pricing, but does not own inventory data.

Asset Inventory must not directly confirm rentals, create or release rental asset blocks, regenerate contracts, or send notifications.

## Persistence

Asset Inventory owns persistence for:

```text
equipment types
physical assets
asset ownership metadata
equipment-type accessory defaults
```

Rental-specific assignments, blocks, selections, pricing snapshots, and owner split snapshots are persisted by the modules that own those rental facts.

## References

* `asset-inventory.public-api.ts`
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`
* `apps/backend/src/modules/tenant-management/README.md`
* `apps/backend/src/modules/catalog/README.md`
* `apps/backend/src/modules/rental-commitment/README.md`
