# Rental Catalog Module

## Purpose

Rental Catalog owns what a tenant offers for rent.

It defines the commercial/catalog layer of the rental business: rentable items, branch-specific rental offers, catalog presentation, visibility, rentability, categories, and the equipment requirements produced by selected rentable items.

Rental Catalog separates what the customer or tenant user selects from what physical assets are eventually assigned.

```text
RentalOffer
  = what the customer/staff selects

RentableItem
  = the catalog/commercial thing being rented

FulfillmentRequirement
  = what equipment type and quantity are required to fulfill it
```

Public API: `rental-catalog.public-api.ts`

## Owns

```text
Rentable items
Rentable item categories
Rentable item catalog presentation
Rentable item kind
Branch-specific rental offers
Rental offer visibility
Rental offer rentability
Rental offer lifecycle/state
Fulfillment requirements
Package composition as fulfillment requirements
Standalone rentable item requirements
```

Examples of questions owned by Rental Catalog:

```text
What rentable items does this tenant define?
Is this rentable item a standalone item or a package?
What branch-specific offers exist for this rentable item?
Is this offer visible in this branch?
Is this offer marked as rentable in this branch?
What equipment requirements does this rentable item produce?
What catalog image/name/description/category should be shown?
```

## Does Not Own

```text
Physical assets
Equipment type operational metadata
Asset ownership
Asset condition
Asset location
Asset availability
Asset assignment
Asset blocks
Rental lifecycle
Rental selections after commitment
Rental demand lines after commitment
Confirmed price snapshots
Rate plans
Rental offer pricing assignments
Promotions
Coupons
Tenant permissions
Tenant configuration
Branch schedules
Accessory preparation decisions
Accessory asset assignments
Contract generation
Signing state
Notification delivery
```

Rental Catalog may reference `tenantId`, `branchId`, and `equipmentTypeId`, but Tenant Management and Asset Inventory remain authoritative over those source records.

Rental Catalog may expose offers that need pricing, but Pricing owns rate plans and rental-offer pricing assignments.

## Dependencies

Rental Catalog may depend on Tenant Management to validate tenant and branch references.

Rental Catalog may depend on Asset Inventory to validate that referenced equipment types exist and belong to the tenant when creating or updating fulfillment requirements.

Rental Commitment depends on Rental Catalog for selected offers, rentable item snapshots, and fulfillment requirements.

Offering Setup may call Rental Catalog public capabilities when coordinating setup workflows.

## Key Domain Concepts

### Rentable Item

A rentable item is the tenant-owned catalog identity that can be rented.

Examples:

```text
Sony FX3 Camera
Filming Kit
Audio Kit
Lighting Package
```

A rentable item owns catalog-facing presentation:

```text
name
description
imageUrl
category
kind
status
```

`V2RentableItem` is the only catalog concept that owns the catalog image URL in the current design.

A rentable item does not own physical assets, asset availability, final rental commitment, or accepted order price snapshots.

### Rentable Item Kind

A rentable item may be a standalone item or a package.

```text
SINGLE
  A rentable item fulfilled by one equipment type requirement.

PACKAGE
  A rentable item fulfilled by multiple equipment type requirements.
```

The kind is useful for UI and business language, but fulfillment comes from requirements, not from the enum alone.

A package is not fulfilled by child rentable items. It is fulfilled by equipment type requirements.

### Rental Offer

A rental offer is the branch-specific commercial offer to rent a rentable item.

It answers:

```text
Does this branch offer this rentable item?
Is it visible?
Is it marked as rentable/selectable?
Is it active for catalog selection?
```

A customer or staff member selects a `RentalOffer`.

```ts
selectedOffers: Array<{
  rentalOfferId: string;
  quantity: number;
}>;
```

Rental Offer does not own price calculation or rate plans. Pricing owns the pricing assignment for a rental offer.

### Fulfillment Requirement

A fulfillment requirement defines the equipment type and quantity required to fulfill one unit of a rentable item.

```text
Standalone item
  RentableItem: Sony FX3 Camera
    requires EquipmentType Sony FX3 x 1

Package
  RentableItem: Filming Kit
    requires EquipmentType Sony FX3 x 1
    requires EquipmentType Tripod x 1
    requires EquipmentType LED Panel x 2
```

Fulfillment requirements bridge the catalog/commercial model to operational fulfillment.

They do not assign assets. They only define required equipment type demand.

### Equipment Type Reference

Rental Catalog may reference an equipment type in a fulfillment requirement.

That reference means:

```text
This rentable item requires this kind of equipment.
```

Asset Inventory remains the authority over the equipment type, physical assets, ownership, condition, location, and eligibility.

### Category

A category is a catalog browsing/presentation grouping for rentable items.

Categories belong to Rental Catalog because they organize the rental catalog, not physical inventory.

## Lifecycle / State Rules

```text
Archived or deleted rentable items should not be selected for new rentals.
Archived or deleted rental offers should not be selected for new rentals.
A rental offer may be visible but not rentable.
A rental offer may be rentable but still not bookable if Pricing has no active pricing assignment.
A visible/rentable offer does not imply physical availability.
Catalog changes affect future selections, not already confirmed rentals.
```

Rental Catalog may allow draft or incomplete setup states for admin workflows.

The public storefront or confirmation flow should only expose offers that are valid for that use case.

## Persistence Ownership

Rental Catalog owns tables related to:

```text
rentable items
rentable item categories
rental offers
fulfillment requirements / rentable item requirements
```

Likely owned table concepts:

```text
v2_rentable_items
v2_rentable_item_categories
v2_rental_offers
v2_rentable_item_requirements
```

Examples of external references:

```text
RentalOffer.branchId references a branch owned by Tenant Management.
FulfillmentRequirement.equipmentTypeId references an equipment type owned by Asset Inventory.
Pricing may reference RentalOffer through its own pricing assignment table.
Rental Commitment snapshots selected RentalOffer and RentableItem data when confirming a rental.
```

## Important Invariants

A customer or staff rental flow selects `RentalOffer`, not raw `RentableItem` or raw `EquipmentType`.

`RentableItem` is the commercial/catalog identity.

`EquipmentType` is the operational fulfillment type owned by Asset Inventory.

A standalone rentable item is still modeled as a `RentableItem` with one fulfillment requirement.

A package is modeled as a `RentableItem` with multiple fulfillment requirements.

Package requirements point to `EquipmentType`, not child `RentableItem` records.

Package requirement rows should not infer images from standalone SINGLE rentable items.

The package parent in UI and rental snapshots is the `RentalSelection`, not the first demand line.

Catalog visibility does not imply physical availability.

Catalog rentability does not imply active pricing.

Catalog must not query asset blocks to decide final availability.

Catalog must not calculate rental prices.

For physical rental items, fulfillment requirement quantity must be positive.

For active physical rentable items, at least one fulfillment requirement should exist before the item can be selected for confirmation.

A tenant should not have duplicate active branch offers for the same rentable item and branch.

If soft deletes are used, uniqueness for active rental offers may require a database-level partial unique index rather than relying on nullable `deletedAt` inside a Prisma `@@unique`.

## Events / Side Effects

Possible event categories include:

```text
Rentable item created
Rentable item updated
Rentable item archived
Rentable item category changed
Rental offer created
Rental offer visibility changed
Rental offer rentability changed
Rental offer archived
Fulfillment requirements changed
```

Rental Catalog should not trigger asset assignment, asset blocking, price recalculation for confirmed rentals, contract regeneration, or notification delivery directly.

## Common Mistakes

Do not treat `EquipmentType` as the thing selected in the cart or rental order flow.

Do not reintroduce separate rental inputs like `selectedEquipmentTypes` and `selectedCombos`.

Do not model packages as collections of child rentable items.

Do not identify a package parent by using the first demand line for a rental selection.

Do not infer package requirement images from standalone SINGLE rentable items that happen to reference the same equipment type.

Do not put physical asset data, asset condition, asset owner, or asset availability in Rental Catalog.

Do not put accessory preparation decisions in Rental Catalog.

Do not put equipment accessory default relationships in Rental Catalog unless that boundary is explicitly redesigned.

Do not put rate plans, tiers, promotions, coupons, or price calculation inside Rental Catalog.

Do not store accepted rental price snapshots in Rental Catalog.

Do not let Rental Commitment query Rental Catalog tables directly to reconstruct selected offers.

Do not assume a visible/rentable offer can be booked without Pricing and availability checks.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/asset-inventory/README.md
apps/backend/src/modules/pricing/README.md
apps/backend/src/modules/rental-commitment/README.md
rental-catalog.public-api.ts
```
