# Rental Catalog Module

Rental Catalog owns what a tenant offers for rent: rentable items, branch-specific rental offers, catalog presentation, visibility, rentability, categories, and fulfillment requirements.

It separates what customers or staff select from the physical assets eventually used to fulfill the rental.

```text
RentalOffer
  = what the customer or staff selects

RentableItem
  = the commercial/catalog thing being rented

FulfillmentRequirement
  = the equipment type and quantity required to fulfill it
```

Public API: `rental-catalog.public-api.ts`

## Domain Concepts

### Rentable Item

A `RentableItem` is the tenant-owned commercial/catalog identity that can be rented.

It owns catalog-facing presentation such as:

```text
name
description
imageUrl
category
kind
status
```

`V2RentableItem` is the catalog concept that owns the catalog image URL.

A rentable item may be:

```text
SINGLE
  Fulfilled by one equipment type requirement.

PACKAGE
  Fulfilled by multiple equipment type requirements.
```

The kind is useful for UI and business language, but fulfillment is defined by requirements rather than by the enum itself.

A package is not composed of child rentable items.

### Rental Offer

A `RentalOffer` is the branch-specific commercial offer for a `RentableItem`.

Customers and staff select `RentalOffer` records in rental flows.

Visibility and rentability are independent:

| `isVisible` | `isRentable` | Meaning                                                       |
| ----------- | ------------ | ------------------------------------------------------------- |
| `true`      | `true`       | Discoverable and selectable.                                  |
| `true`      | `false`      | Discoverable but unavailable for selection.                   |
| `false`     | `true`       | Hidden from discovery but selectable through direct-ID flows. |
| `false`     | `false`      | Hidden and not selectable.                                    |

Storefront discovery uses `isVisible` and exposes `isRentable`.

Selection and request validation use `isRentable`, not `isVisible`.

Archived offers are neither discoverable nor selectable regardless of these flags.

### Fulfillment Requirement

A `FulfillmentRequirement` defines the equipment type and quantity required to fulfill one unit of a rentable item.

```text
SINGLE
  RentableItem: Sony FX3 Camera
    requires EquipmentType Sony FX3 x 1

PACKAGE
  RentableItem: Filming Kit
    requires EquipmentType Sony FX3 x 1
    requires EquipmentType Tripod x 1
    requires EquipmentType LED Panel x 2
```

Fulfillment requirements bridge the commercial catalog to operational fulfillment.

They define equipment demand but do not assign physical assets.

### Category

A category groups rentable items for catalog browsing and presentation.

Categories belong to Rental Catalog rather than physical inventory.

## Business Rules

Rental flows select `RentalOffer`, not raw `RentableItem` or `EquipmentType` records.

A standalone rentable item is modeled as a `RentableItem` with one fulfillment requirement.

A package is modeled as a `RentableItem` with multiple fulfillment requirements.

Package requirements reference `EquipmentType`, not child `RentableItem` records.

Package requirement rows must not infer presentation images from unrelated standalone rentable items that reference the same equipment type.

The package parent in rental UI and snapshots is the `RentalSelection`, not the first generated demand line.

Archived or deleted rentable items and rental offers must not be selected for new rentals.

A rental offer may be visible but not rentable.

A rental offer may be hidden but rentable and still be selected through direct-ID flows.

A rental offer may be rentable but not bookable if Pricing has no active pricing assignment.

Visible or rentable catalog state does not imply physical availability.

Catalog changes affect future selections, not already confirmed rentals.

Rental Catalog may allow draft or incomplete setup states for admin workflows.

For physical rentable items, fulfillment requirement quantities must be positive.

An active physical rentable item must have at least one fulfillment requirement before it can be selected for confirmation.

A tenant must not have duplicate active offers for the same rentable item and branch.

If soft deletes are used, active-offer uniqueness may require a database partial unique index rather than a Prisma `@@unique` involving nullable `deletedAt`.

## Boundaries

Asset Inventory owns `EquipmentType` and physical asset facts. Rental Catalog may reference `equipmentTypeId` in fulfillment requirements but does not own assets, condition, ownership, location, or assignment eligibility.

Rental Catalog must not query rental asset blocks to determine final physical availability.

Pricing owns rate plans, pricing assignments, promotions, coupons, and price calculation for rental offers.

Catalog rentability does not imply that valid pricing exists.

Rental Commitment owns committed selections, generated demand lines, confirmed price snapshots, and physical assignment/blocking for a rental.

Rental Commitment must use Rental Catalog public capabilities rather than querying catalog tables directly when reconstructing selected offers.

Tenant Management owns tenants and branches, including branch schedules and configuration. Rental Catalog may reference and validate `tenantId` and `branchId`.

Offering Setup may coordinate Rental Catalog with Asset Inventory and Pricing but does not own catalog data.

Accessory preparation decisions and equipment-type accessory defaults do not belong to Rental Catalog.

Rental Catalog must not directly assign assets, create asset blocks, recalculate confirmed rental prices, regenerate contracts, or deliver notifications.

## Persistence

Rental Catalog owns persistence for:

```text
rentable items
rentable item categories
rental offers
fulfillment requirements
```

Pricing assignments, rental selections, demand lines, assignments, blocks, and confirmed rental snapshots are persisted by their owning modules.

## References

* `rental-catalog.public-api.ts`
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`
* `apps/backend/src/modules/tenant-management/README.md`
* `apps/backend/src/modules/asset-inventory/README.md`
* `apps/backend/src/modules/pricing/README.md`
* `apps/backend/src/modules/rental-commitment/README.md`
