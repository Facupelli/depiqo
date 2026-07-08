# Asset Inventory Module

## Purpose

Asset Inventory owns the physical truth about equipment.

It answers what equipment types exist, what physical assets exist, where those assets belong, what condition they are in, who owns them, whether they are active, and whether they can be considered as assignment candidates for rental fulfillment.

Asset Inventory is not the rental commitment engine. It describes and validates physical assets, but it does not own rental lifecycle, assigned rental state, or rental-created asset blocks.

Public API: `asset-inventory.public-api.ts`

## Owns

```text
Equipment types
Physical assets
Asset identity
Asset operational metadata
Asset condition
Asset active/inactive state
Asset branch/location reference
Asset ownership
Third-party asset ownership metadata
Asset assignment eligibility facts
Equipment-type accessory defaults
Equipment-type accessory default quantities
```

Examples of questions owned by Asset Inventory:

```text
Does this equipment type exist?
Does this asset exist?
Does this asset belong to this tenant?
Which equipment type does this asset satisfy?
Which branch is this asset associated with?
Is this asset active?
What condition is this asset in?
Is this asset tenant-owned or third-party-owned?
Who owns this third-party asset?
Which accessories are suggested by default for this equipment type?
```

Asset Inventory owns the current physical profile of assets. Historical rental facts that must survive later asset changes belong to Rental Commitment or downstream snapshot records.

## Does Not Own

```text
Rentable catalog identity
Rentable item images
Catalog categories
Rental offers
Catalog visibility
Catalog rentability
Rental lifecycle
Rental selections
Rental demand lines
Assigned rental asset references
Asset blocks
Accessory selections for a specific rental
Accessory asset assignments for a specific rental
Confirmed price snapshots
Owner split snapshots for a confirmed rental
Rate plans
Promotions
Coupons
Contract generation
Signing state
Notification delivery
Tenant permissions
Branch schedules
```

Asset Inventory may validate that an asset or equipment type exists and is eligible for assignment, but Rental Commitment owns the decision to assign and block assets for a specific rental.

Asset Inventory may own current asset ownership metadata, but Rental Commitment must snapshot owner split data when a rental is confirmed if that data affects payout, audit, or financial history.

## Dependencies

Asset Inventory may depend on Tenant Management to validate tenant and branch references.

Rental Commitment depends on Asset Inventory for current asset facts, assignment eligibility, current ownership data, and accessory default data.

Rental Catalog may depend on Asset Inventory to validate equipment type references when creating fulfillment requirements.

Offering Setup may coordinate Asset Inventory with Rental Catalog and Pricing, but Offering Setup must not become the owner of inventory data.

## Key Domain Concepts

### Equipment Type

An equipment type is the operational type or model of equipment used to group interchangeable physical assets.

Examples:

```text
Sony FX3
Manfrotto Tripod
LED Panel
Battery Pack
Cable Accesorio
```

An equipment type answers:

```text
What kind of asset is required?
What kind of asset can fulfill this demand?
```

An equipment type is not the catalog item selected by the customer. Rental Catalog owns `RentableItem` and `RentalOffer`.

### Asset

An asset is a physical unit.

Examples:

```text
Sony FX3 serial #001
Sony FX3 serial #002
Tripod serial #009
Cable serial #003
```

An asset belongs to one tenant and satisfies one equipment type.

Asset Inventory owns the asset's current physical profile:

```text
equipment type
serial/reference data
condition
active state
branch/location reference
ownership
metadata
```

Rental Commitment may reference an asset by ID, but Asset Inventory remains the authority over the physical asset profile.

### Asset Ownership

Asset ownership describes who currently owns the physical asset.

An asset may be tenant-owned or third-party-owned.

Third-party ownership metadata belongs here because it describes the current physical asset profile.

Current asset ownership is not enough for confirmed rental history. If owner payout or audit depends on ownership at confirmation time, Rental Commitment must preserve owner split snapshots.

### Asset Condition

Asset condition describes the current operational state of the physical asset.

Condition may affect whether an asset can be considered eligible for assignment.

Condition changes affect future assignment decisions. They must not rewrite confirmed rental assignments or historical owner split snapshots.

### Asset Branch / Location Reference

An asset may reference a branch/location owned by Tenant Management.

That reference means the asset is associated with that tenant branch for inventory and fulfillment purposes.

Tenant Management remains the authority over the branch itself, including active state, schedules, and timezone rules.

### Equipment-Type Accessory Default

An equipment-type accessory default defines a suggested accessory relationship between two equipment types.

Example:

```text
EquipmentType: Avenger C210 Baby Pipe
  default accessory:
    EquipmentType: Cable Accesorio x 1
```

This is an operational equipment-type relationship, not a catalog item relationship.

Accessory defaults are used to suggest rental-specific accessory selections during preparation, but Rental Commitment owns the actual accessory selections, accessory asset assignments, and accessory asset blocks for a rental.

Accessory defaults should not imply that accessories are automatically assigned or blocked.

## Lifecycle / State Rules

```text
Inactive assets should not be assigned to new rentals.
Deleted or soft-deleted assets should not be assigned to new rentals.
Inactive equipment types should not be used for new operational setup unless a specific workflow allows historical reads or migration.
Condition changes affect future assignment eligibility.
Branch/location changes affect future assignment eligibility.
Ownership changes affect future ownership facts, not historical rental owner split snapshots.
```

Asset Inventory may allow assets to exist even if they are not currently rentable or assignable.

For example, an asset may be inactive, under maintenance, retired, or internal-only.

## Persistence Ownership

Asset Inventory owns tables related to:

```text
equipment types
physical assets
asset ownership metadata
equipment-type accessory defaults
```

Likely owned table concepts:

```text
v2_equipment_types
v2_assets
v2_equipment_type_accessory_defaults
```

Examples of external references:

```text
Rental Catalog fulfillment requirements may reference equipmentTypeId.
Rental Commitment assigned asset references may reference assetId.
Rental Commitment asset blocks may reference assetId.
Rental Commitment owner split snapshots may reference ownerId or assetId for historical explanation.
Tenant Management owns the branch referenced by an asset.
```

## Important Invariants

`EquipmentType` is the operational fulfillment type. It is not the customer-selected catalog item.

`Asset` is the physical unit. It is not the rental assignment itself.

Rental Commitment owns all rental-related asset blocks, including equipment blocks and accessory blocks.

Asset Inventory may validate asset eligibility, but Rental Commitment decides which assets are assigned and blocked for a rental.

Asset Inventory owns current asset ownership. Rental Commitment owns historical owner split snapshots for confirmed rentals.

Do not default missing assigned-asset ownership data to tenant-owned during rental reconstitution. If historical ownership matters, it must be snapshotted explicitly.

Equipment-type accessory defaults are suggestions/configuration. They are not rental-specific accessory selections.

Accessory defaults must not create accessory asset assignments or accessory asset blocks by themselves.

An equipment type should not define itself as its own accessory default.

Accessory default quantity must be positive.

An asset must belong to the same tenant as its equipment type.

An asset must satisfy the equipment type it claims to satisfy.

A branch reference on an asset must belong to the same tenant.

Current asset metadata changes must not mutate confirmed rental snapshots.

## Events / Side Effects

Possible event categories include:

```text
Equipment type changes
Asset creation
Asset metadata changes
Asset condition changes
Asset branch/location changes
Asset ownership changes
Asset activation/deactivation
Equipment-type accessory default changes
```

If Rental Commitment keeps a local availability candidate/read model, it may consume asset events to keep that read model synchronized.

Asset Inventory should not emit events that directly confirm rentals, create asset blocks, release asset blocks, regenerate contracts, or send notifications.

## Common Mistakes

Do not put catalog names, storefront copy, catalog categories, rental offers, or catalog images in Asset Inventory.

Do not treat `EquipmentType` as the selectable rental item.

Do not reintroduce the old model where rental flows select raw equipment types and combos directly.

Do not put asset blocks in Asset Inventory.

Do not query Rental Commitment asset blocks directly from Asset Inventory to decide availability.

Do not mutate physical asset metadata when assigning an asset to a rental.

Do not store confirmed rental price, rental selections, or demand lines in Asset Inventory.

Do not store rental-specific accessory selections in Asset Inventory.

Do not treat accessory defaults as mandatory accessories unless the domain explicitly introduces mandatory accessory rules later.

Do not infer package contents from assets. Package fulfillment comes from Rental Catalog fulfillment requirements.

Do not calculate owner payouts from live asset ownership after confirmation.

Do not let ownership changes rewrite historical rental payout facts.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/catalog/README.md
apps/backend/src/modules/rental-commitment/README.md
asset-inventory.public-api.ts
```
