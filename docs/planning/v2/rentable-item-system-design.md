# Rentable Item System Design

## Purpose

This document explains the rental catalog and fulfillment model for the redesigned rental system.

The old model had two selectable concepts: `EquipmentType` and `Combo`. Both could be rented, but they behaved differently. A standalone equipment type could be selected and fulfilled directly by assets. A combo could be selected, but had to expand into equipment requirements.

The new model separates commercial selection from operational fulfillment.

```text
RentalOffers are selected.
RentableItems are rented.
RentableItemRequirements are expanded.
EquipmentTypes are required.
Assets are assigned.
```

Or, more practically:

```text
Customers select offers.
Offers point to rentable items.
Rentable items define requirements.
Requirements point to equipment types.
Equipment types are fulfilled by assets.
```

---

# Core Concepts

## RentableItem

A `RentableItem` is the tenant-owned rentable catalog item. It is what customers and staff see as the thing being rented.

Examples: `Sony FX3 Camera`, `Filming Kit`, `Audio Kit`, `Lighting Combo`.

A standalone item is a `RentableItem` with one `RentableItemRequirement`. A package/combo is a `RentableItem` with multiple `RentableItemRequirement`s.

`RentableItem` owns catalog identity and presentation: name, description, image, category, kind, and status. It does not own physical asset state, asset availability, order state, asset blocks, or accepted price snapshots.

## Catalog RentalOffer

A Catalog `RentalOffer` is the branch-specific selectable offer to rent a `RentableItem`.

It answers whether a branch offers an item, whether the offer is visible, whether it is rentable/selectable, and which rentable item it exposes.

A customer or staff member selects `RentalOffer`s.

```ts
selectedOffers: Array<{
  rentalOfferId: string;
  quantity: number;
}>;
```

A Catalog `RentalOffer` does not own pricing rules or rate-plan assignment. Pricing owns `RentalOfferPricing`, which maps a Catalog `RentalOffer` to a `RatePlan`.

```text
Catalog decides what can be selected.
Pricing decides how selected things are priced.
```

## RentalOfferPricing

`RentalOfferPricing` belongs to Pricing, not Rental Catalog. It is the pricing-side representation of a Catalog `RentalOffer`.

It answers which `RatePlan` prices this Catalog offer and whether pricing is active for this offer.

It references the Catalog offer by external id:

```text
catalogRentalOfferId
```

This name is intentional. Pricing does not own the Catalog `RentalOffer`; it owns pricing configuration for it.

```text
Catalog RentalOffer
  └── Pricing RentalOfferPricing
        └── RatePlan
              └── RatePlanTier[]
```

## RentableItemRequirement

A `RentableItemRequirement` is the Catalog-side definition of what equipment is required to fulfill one unit of a `RentableItem`.

```text
Standalone:
  RentableItem Sony FX3 Camera
  requires EquipmentType Sony FX3 x 1

Package:
  RentableItem Filming Kit
  requires EquipmentType Sony FX3 x 1
  requires EquipmentType Tripod x 1
  requires EquipmentType LED Panel x 2
```

This concept was previously called `FulfillmentRequirement`. The preferred name is now `RentableItemRequirement` because it belongs to the rentable item definition inside Rental Catalog. `RentableItemEquipmentRequirement` is also acceptable if the implementation wants to be explicit that the current requirement type is equipment-based.

## EquipmentType

An `EquipmentType` is the operational type/model of equipment used to group interchangeable assets.

Examples: `Sony FX3`, `Manfrotto Tripod`, `LED Panel`, `Battery Pack`.

An `EquipmentType` is not the storefront item anymore. It answers: what kind of asset do we need?

A standalone rentable item may feel duplicated:

```text
RentableItem: Sony FX3 Camera
requires:
  EquipmentType Sony FX3 x 1
```

That duplication is intentional. `RentableItem` is commercial/catalog language. `EquipmentType` is operational/inventory language.

## Asset

An `Asset` is the actual physical object, such as `Sony FX3 serial #001` or `Tripod serial #009`.

Assets are assigned and blocked when a rental order is confirmed. The asset is the thing that must not be double-booked.

---

# Concept Diagram

```text
Tenant
  ├── RentableItem
  │     └── RentableItemRequirement
  │             └── EquipmentType
  │                     └── Asset
  │
  └── Branch
        └── Catalog RentalOffer
                └── RentableItem

Pricing
  └── RentalOfferPricing
        ├── catalogRentalOfferId
        └── RatePlan
              └── RatePlanTier[]
```

Read as: a branch publishes Catalog `RentalOffer`s; a Catalog `RentalOffer` points to one `RentableItem`; a `RentableItem` has `RentableItemRequirement`s; a requirement points to one `EquipmentType` and quantity; an `EquipmentType` groups physical `Asset`s; Pricing maps a Catalog `RentalOffer` to a `RatePlan` through `RentalOfferPricing`; Rental Commitment assigns and blocks specific `Asset`s.

---

# Standalone, Package, and Internal-Only Equipment

A standalone item is a `RentableItem` with one requirement. A package is a `RentableItem` with multiple requirements. Internal-only equipment can exist without a standalone `RentableItem` or Catalog `RentalOffer`.

Example:

```text
EquipmentType: Battery Pack
Assets: BATTERY-001, BATTERY-002, BATTERY-003
No standalone RentableItem.
No standalone RentalOffer.

RentableItem: Filming Kit
Requirement: Battery Pack x 4
```

This is one of the main reasons `RentableItem` and `EquipmentType` must remain separate.

---

# Why Not Keep EquipmentType as the Storefront Item?

The old model became asymmetric when packages appeared.

```text
EquipmentType:
  selected directly
  fulfilled directly by assets

Combo:
  selected directly
  expands into equipment types
  fulfilled indirectly by assets
```

That forced rental flows to handle two selected shapes: `selectedEquipmentTypes[]` and `selectedCombos[]`.

The new model removes that split.

```ts
selectedOffers: Array<{
  rentalOfferId: string;
  quantity: number;
}>;
```

The selected thing is always a Catalog `RentalOffer`.

---

# Create Rental Order Flow

```text
selectedOffers[]
      │
      ▼
Rental Catalog resolves selected Catalog RentalOffers
      │
      ├── validates branch, visibility, rentability, and item state
      ├── returns RentableItem snapshots
      └── returns RentableItemRequirements
      │
      ▼
Pricing calculates from resolved commercial selections
      │
      ├── uses rentalOfferId
      ├── resolves RentalOfferPricing
      └── applies RatePlan / RatePlanTier
      │
      ▼
Rental Commitment expands requirements into RentalDemandLines
      │
      ▼
Asset allocation checks EquipmentType demand
      │
      ▼
Rental Commitment creates:
  RentalSelections
  RentalDemandLines
  AssignedAssetReferences
  AssetBlocks
  ConfirmedPriceSnapshot
```

Pricing prices commercial selections. Availability and allocation use equipment demand. Pricing should not rediscover package relationships from flattened equipment lines. Availability should not care whether demand came from a standalone item or package.

---

# Rental Order Aggregate Shape

The rental order preserves both commercial truth and operational truth.

```text
RentalOrder
  ├── RentalSelection
  │     └── RentalDemandLine
  │           └── AssignedAssetReference
  └── ConfirmedPriceSnapshot
```

`RentalSelection` is the order-local commercial snapshot.

```text
rentalSelectionId
rentalOfferId
rentableItemId
rentableItemNameSnapshot
rentableItemKindSnapshot
quantity
```

`RentalDemandLine` is the order-local fulfillment demand snapshot.

```text
rentalDemandLineId
rentalSelectionId
equipmentTypeId
equipmentTypeNameSnapshot
quantity
```

`AssignedAssetReference` points to the assigned asset. `AssetBlock` protects that asset from overlapping rentals.

---

# Requirement Definition vs Demand Snapshot

Do not confuse these two concepts.

```text
RentableItemRequirement
  Catalog definition.
  Reusable rule.
  Says what one unit of a RentableItem requires.

RentalDemandLine
  Rental Commitment snapshot.
  Order-local fact.
  Says what this specific order requires.
```

Example:

```text
Catalog:
  Filming Kit requires LED Panel x 2

Order:
  Customer selected Filming Kit x 3
  RentalDemandLine: LED Panel x 6
```

After confirmation, the order must rely on its own `RentalDemandLine`s, not live Catalog requirements. Catalog changes must not mutate confirmed orders.

---

# Order-Local IDs

`RentalSelection` and `RentalDemandLine` must have their own order-local IDs.

Do not use external Catalog IDs as local order IDs.

Avoid:

```ts
rentalSelectionId = rentalOfferId
rentalDemandLineId = `${rentalOfferId}:${equipmentTypeId}`
```

Prefer generated IDs:

```ts
rentalSelectionId = randomUUID()
rentalDemandLineId = randomUUID()
```

Or use domain wrappers owned by Rental Commitment:

```ts
RentalSelectionId.create()
RentalDemandLineId.create()
```

The important rule is:

```text
RentalOfferId identifies a Catalog offer.
RentalSelectionId identifies an order-local selection.
RentalDemandLineId identifies an order-local demand line.
```

---

# Bounded Context Ownership

## Rental Catalog

Owns `RentableItem`, Catalog `RentalOffer`, `RentableItemRequirement`, catalog presentation, and branch offer visibility/rentability. It answers what can be selected, what rentable item an offer exposes, what the item requires, and whether a branch can offer it.

It does not own `RatePlan`, `RatePlanTier`, `RentalOfferPricing`, final price calculation, asset assignment, asset blocks, or confirmed order snapshots.

## Pricing

Owns `RentalOfferPricing`, `RatePlan`, `RatePlanTier`, `Promotion`, `PromotionScope`, `PromotionExclusion`, `Coupon`, `CouponRedemption`, price calculation, and price breakdown. It answers how a selected offer is priced, which rate plan applies, which promotions/coupons apply, and what the final price breakdown is.

It does not own Catalog `RentalOffer` visibility/rentability, `RentableItem` definitions, asset assignment, or rental commitment.

## Asset Inventory

Owns `EquipmentType`, `Asset`, asset condition, asset location, asset ownership, and asset active/inactive state. It answers what equipment types and assets exist, where assets are, and whether an asset is an eligible assignment candidate. It does not own rental-related asset blocks.

## Rental Commitment

Owns `RentalOrder`, `RentalSelection`, `RentalDemandLine`, `AssignedAssetReference`, `AssetBlock`, and `ConfirmedPriceSnapshot`. It answers what was requested, committed, snapshotted, assigned, and blocked. Rental Commitment is the authority over all rental-related asset blocks.

## Tenant Management

Owns `Tenant`, `Branch`, branch schedule, pickup/return slots, timezone, tenant users, permissions, and configuration. It answers whether the tenant, branch, user, and rental period are valid.

---

# Context Map

```text
Tenant Management
  owns Tenant, Branch, schedules, permissions
        ▲
        │ validates tenant/branch rules
        │
Rental Commitment ───────────► Rental Catalog
  owns orders, selections,       owns RentableItem,
  demand snapshots, blocks       Catalog RentalOffer,
        │                        RentableItemRequirement
        │
        ├───────────────────► Pricing
        │                        owns RentalOfferPricing,
        │                        RatePlan, RatePlanTier
        │
        └───────────────────► Asset Inventory
                                 owns EquipmentType and Asset
```

Important references: Catalog `RentalOffer` references Branch and RentableItem. `RentalOfferPricing` references Catalog `RentalOffer` by `catalogRentalOfferId` and references `RatePlan`. `RentableItemRequirement` references `EquipmentType`. `Asset` references `EquipmentType` and Branch. `RentalSelection` snapshots Catalog offer/item data. `RentalDemandLine` snapshots equipment demand. `AssignedAssetReference` references Asset. `AssetBlock` owns the rental block.

---

# Design Rules

The storefront lists Catalog `RentalOffer`s. The cart selects Catalog `RentalOffer`s. Catalog `RentalOffer` must not store `ratePlanId`. Pricing owns `RentalOfferPricing`. `RentableItemKind` is for UI and reporting only. Fulfillment comes from `RentableItemRequirement`s, not from branching on item kind. Pricing usually prices commercial selections, not equipment demand. Availability checks `EquipmentType` demand and should not care about packages. Confirmed orders must snapshot selection, demand, price, assigned assets, branch, and rental period. Asset blocks belong to Rental Commitment, even though Asset Inventory owns asset profiles.

---

# Do Not Reintroduce

Do not add `selectedEquipmentTypes` or `selectedCombos` to new rental commands. Do not use `EquipmentType` as the storefront item. Do not add `ratePlanId` back to Catalog `RentalOffer`. Do not make Pricing own Catalog visibility or rentability. Do not calculate confirmed order demand from live Catalog requirements. Do not let Asset Inventory own rental-related asset blocks. Do not derive `RentalSelectionId` from `RentalOfferId`. Do not derive `RentalDemandLineId` from Catalog or Inventory IDs.

---

# Migration Direction

Standalone rentable equipment becomes a `RentableItem`, a `RentableItemRequirement` pointing to the existing `EquipmentType x 1`, Catalog `RentalOffer`s per branch, and `RentalOfferPricing` records in Pricing.

Existing combos become a `RentableItem`, one `RentableItemRequirement` per combo component, Catalog `RentalOffer`s per branch, and `RentalOfferPricing` records in Pricing.

Internal-only equipment remains as `EquipmentType` and `Asset`s, without standalone `RentableItem`, Catalog `RentalOffer`, or `RentalOfferPricing`.

---

# Open Questions

Should `RentableItemRequirement` support branch-specific overrides later? Can future rentable items have zero equipment requirements, such as delivery, insurance, services, or add-ons? Should accessories become normal assets or remain separate definitions? Should Rental Catalog keep an EquipmentType read model for admin UX? Should Pricing ever calculate from equipment requirements, or only from selected offers? Should package composition changes invalidate pending carts? Should pending orders snapshot requirements immediately or resolve requirements fresh at confirmation? How should storefront read models compose Catalog and Pricing data efficiently? How much Catalog and Pricing data should confirmed orders snapshot?

---

# Final Summary

The new design separates concepts that were previously mixed together.

```text
RentableItem = what the tenant defines as rentable.
Catalog RentalOffer = how a branch makes a RentableItem selectable.
RentalOfferPricing = how Pricing maps a Catalog RentalOffer to a RatePlan.
RentableItemRequirement = what equipment demand a RentableItem creates.
EquipmentType = what kind of asset is required.
Asset = the actual physical object assigned and blocked.
```

The core flow is:

```text
selectedOffers[]
  -> resolve Catalog RentalOffers
  -> snapshot RentableItems
  -> expand RentableItemRequirements
  -> create RentalDemandLines
  -> price selected offers through RentalOfferPricing
  -> check EquipmentType demand
  -> assign Assets
  -> create AssetBlocks
  -> confirm RentalOrder
```

This keeps storefront selection, pricing, availability, and order commitment aligned while avoiding the old split between selected equipment types and selected combos.
