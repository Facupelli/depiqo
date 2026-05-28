# Pricing System Design

## Purpose

This document explains the redesigned pricing model for the rental system.

The old pricing model was tied to old selectable concepts such as `ProductType` and `Bundle/Combo`. That repeated the catalog design problem: Pricing had to know whether a selected thing was standalone equipment or a combo.

The new pricing model follows the redesigned rental selection model.

```text
Customers select Catalog RentalOffers.
Pricing maps Catalog RentalOffers to RatePlans.
RatePlans contain RatePlanTiers.
Promotions and coupons apply to selected commercial offers.
Rental Commitment stores the accepted price snapshot.
```

Pricing owns pricing behavior, not catalog selection, asset allocation, or rental commitment.

---

# Core Concepts

## Catalog RentalOffer

A Catalog `RentalOffer` is owned by Rental Catalog. It is the branch-specific selectable offer to rent a `RentableItem`.

It owns catalog selection data:

```text
tenantId
branchId
rentableItemId
isVisible
isRentable
```

It must not store `ratePlanId`.

## RentalOfferPricing

`RentalOfferPricing` belongs to Pricing. It is the pricing-side representation of a Catalog `RentalOffer`.

It answers which `RatePlan` prices this Catalog offer and whether pricing is active.

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

## RatePlan

A `RatePlan` is the named base pricing policy.

Examples:

```text
Daily Camera Rate
Hourly Audio Rate
Filming Kit Daily Rate
Weekend Kit Rate
```

It owns shared pricing metadata:

```text
name
billingUnit
currency
isActive
```

## RatePlanTier

A `RatePlanTier` is one duration tier inside a `RatePlan`.

```text
RatePlan: Daily Camera Rate
  1-2 days: 100/day
  3-6 days: 80/day
  7+ days: 60/day
```

The split exists because one selected offer uses a whole pricing policy, not one individual tier row.

```text
RatePlan = the price list.
RatePlanTier = one line inside the price list.
RentalOfferPricing = assigns a Catalog offer to a price list.
```

## Promotion

A `Promotion` is a discount rule. It defines identity, validity window, activation mode, priority, stackability, effect, and basic eligibility conditions.

Promotions are adjustments applied after base pricing. Long-rental decreasing prices are not promotions; they belong in `RatePlanTier`.

## PromotionScope

A `PromotionScope` defines where a promotion may apply.

Supported targets:

```text
all selected lines
specific RentableItem
specific Catalog RentalOffer
specific Category
```

Scope by `RentableItem` for “Filming Kit everywhere.” Scope by Catalog `RentalOffer` for “Filming Kit only at Palermo branch.”

## PromotionExclusion

A `PromotionExclusion` removes specific targets from a broader promotion.

Examples:

```text
All rentable items except Sony FX3.
Camera category except the premium Sony FX3 offer at Palermo.
```

## Coupon and CouponRedemption

A `Coupon` is a code that activates a coupon-required promotion. It may define validity window, usage limits, customer restriction, and active/inactive state.

A `CouponRedemption` records that a coupon was used for an order. Coupon validation and coupon redemption are separate.

```text
Price calculation validates coupon eligibility.
Order confirmation creates CouponRedemption atomically.
```

---

# Base Pricing Flow

```text
selectedOffers[]
      │
      ▼
For each selected rentalOfferId:
  find RentalOfferPricing by catalogRentalOfferId
      │
      ▼
Resolve RatePlan
      │
      ▼
Calculate charged units from rental period and billingUnit
      │
      ▼
Find matching RatePlanTier
      │
      ▼
lineSubtotal = chargedUnits × pricePerUnit × quantity
```

Pricing prices commercial selections, not expanded equipment demand. A package should usually be priced as the selected package, not as the sum of its equipment components.

---

# Rate Tier Behavior

Initial behavior is single-applicable tier pricing.

```text
RatePlan: Daily Camera Rate
Tier 1: 1-2 days = 100/day
Tier 2: 3-6 days = 80/day
Tier 3: 7+ days = 60/day
```

If the rental is 5 days:

```text
5 days matches Tier 2.
lineSubtotal = 5 × 80 × quantity
```

This is not progressive tiering. Progressive tiering is a different behavior and should not be added unless explicitly needed.

---

# Promotion and Coupon Flow

```text
Base line prices
      │
      ▼
Find eligible automatic promotions
      │
      ▼
If couponCode exists:
  validate Coupon
  resolve coupon Promotion
      │
      ▼
Build candidate promotion list
      │
      ▼
Sort by priority
      │
      ▼
Apply according to stackability
      │
      ▼
Return price breakdown
```

Recommended initial behavior:

```text
Higher priority applies first.
If a non-stackable promotion is applied, stop.
If a promotion is stackable, continue to the next eligible promotion.
```

This is easier to explain than “best discount wins.”

---

# Promotion Eligibility

A promotion is eligible only if all basic checks pass.

```text
tenantId matches
isActive is true
deletedAt is null
calculation date is within validFrom / validUntil
activation mode is compatible
minOrderSubtotal is satisfied, if present
minRentalUnits / maxRentalUnits are satisfied, if present
at least one selected line matches scope
matching lines are not excluded
```

For coupon-required promotions, coupon validation also requires:

```text
coupon exists for tenant
coupon is active
coupon date window is valid
coupon customer restriction matches, if present
maxUses is not exceeded
maxUsesPerCustomer is not exceeded
coupon promotion is active
coupon promotion requires coupon activation
```

Only non-voided redemptions count toward usage limits.

---

# Scope Matching

Each priced line should contain enough data to match promotion scopes.

```ts
type PricedLine = {
  rentalOfferId: string;
  rentableItemId: string;
  categoryId?: string;
  quantity: number;
  subtotal: string;
};
```

A line matches when it matches at least one scope.

```text
appliesToAll: every line matches
rentableItemId: line.rentableItemId matches
rentalOfferId: line.rentalOfferId matches
categoryId: line.categoryId matches
```

Exclusions remove lines from the eligible set.

```text
eligibleLines = lines matching scopes - lines matching exclusions
```

If `eligibleLines` is empty, the promotion does not apply.

---

# Promotion Effects

First version supports:

```text
PERCENTAGE_OFF
FIXED_AMOUNT_OFF
```

And two targets:

```text
ORDER
ELIGIBLE_LINES
```

For `PERCENTAGE_OFF`:

```text
ORDER: discount = orderSubtotal × percentage
ELIGIBLE_LINES: discount = eligibleLinesSubtotal × percentage
```

For `FIXED_AMOUNT_OFF`:

```text
ORDER: discount = min(effectValue, orderRemainingSubtotal)
ELIGIBLE_LINES: discount = min(effectValue, eligibleLinesRemainingSubtotal)
```

For fixed discounts across multiple eligible lines, allocate proportionally by eligible line subtotal. Rounding must be deterministic.

---

# Coupon Redemption Timing

Do not consume coupon usage during quote calculation.

```text
Price calculation:
  validates coupon
  includes coupon discount in result
  does not create permanent redemption

Order confirmation:
  revalidates coupon
  creates CouponRedemption
  confirms order atomically
```

If the order is cancelled, the redemption can be voided.

```text
CouponRedemption.voidedAt = now()
```

Only non-voided redemptions count toward usage limits.

---

# Pricing Result Snapshot

Pricing returns a snapshot-friendly result. Rental Commitment stores the accepted result on the order.

The snapshot should explain currency, base line subtotals, charged units, billing unit, rate plan used, tier used, applied promotions, applied coupon, discount totals, and final totals.

Later changes to rate plans, tiers, promotions, or coupons must not mutate confirmed order prices.

---

# Model Summary

`RentalOfferPricing` is owned by Pricing and stores: `id`, `tenantId`, `catalogRentalOfferId`, `ratePlanId`, `isActive`, `deletedAt`, `createdAt`, `updatedAt`. `catalogRentalOfferId` is the external Catalog offer id and should be unique per tenant. `ratePlanId` references `RatePlan`.

`RatePlan` is owned by Pricing and stores: `id`, `tenantId`, `name`, `billingUnit`, `currency`, `isActive`, `deletedAt`, `createdAt`, `updatedAt`.

`RatePlanTier` is owned by Pricing and stores: `id`, `tenantId`, `ratePlanId`, `fromUnit`, `toUnit`, `pricePerUnit`, `createdAt`, `updatedAt`. Use `unique(ratePlanId, fromUnit)`. `toUnit = null` means open-ended tier.

`Promotion` is owned by Pricing and stores: `id`, `tenantId`, `name`, `activation`, `priority`, `stackable`, `isActive`, `validFrom`, `validUntil`, `effectType`, `effectValue`, `target`, `minOrderSubtotal`, `minRentalUnits`, `maxRentalUnits`, `deletedAt`, `createdAt`, `updatedAt`.

`PromotionScope` is owned by Pricing and stores: `id`, `tenantId`, `promotionId`, `appliesToAll`, `rentableItemId`, `rentalOfferId`, `categoryId`, `createdAt`. Use nullable foreign keys plus DB check constraints. Exactly one target must be selected.

`PromotionExclusion` is owned by Pricing and stores: `id`, `tenantId`, `promotionId`, `rentableItemId`, `rentalOfferId`, `categoryId`, `createdAt`. Exactly one target must be selected.

`Coupon` is owned by Pricing and stores: `id`, `tenantId`, `promotionId`, `code`, `maxUses`, `maxUsesPerCustomer`, `restrictedToCustomerId`, `validFrom`, `validUntil`, `isActive`, `createdAt`, `updatedAt`. Use `unique(tenantId, code)`. A coupon must reference a `COUPON_REQUIRED` promotion.

`CouponRedemption` is owned by Pricing or created atomically during Rental Commitment confirmation. It stores: `id`, `couponId`, `orderId`, `customerId`, `redeemedAt`, `voidedAt`. Initial rule: one coupon per order; only non-voided redemptions count toward limits.

---

# Manual Database Constraints

`PromotionScope` must have exactly one target: `appliesToAll`, `rentableItemId`, `rentalOfferId`, or `categoryId`.

`PromotionExclusion` must have exactly one target: `rentableItemId`, `rentalOfferId`, or `categoryId`.

Use manual SQL check constraints because Prisma does not fully express these constraints. Also add partial unique indexes to prevent duplicate scope/exclusion rows for the same promotion and target.

---

# Bounded Context Ownership

Pricing owns `RentalOfferPricing`, `RatePlan`, `RatePlanTier`, `Promotion`, `PromotionScope`, `PromotionExclusion`, `Coupon`, `CouponRedemption`, price calculation, and price breakdown.

Rental Catalog owns `RentableItem`, Catalog `RentalOffer`, `Category`, catalog presentation, and branch visibility/rentability. Pricing may receive catalog snapshots such as `rentableItemId`, `rentalOfferId`, `categoryId`, and item name for matching/explanation, but it does not own Catalog behavior.

Rental Commitment owns `RentalOrder`, `RentalSelection`, and `ConfirmedPriceSnapshot`. It stores the accepted pricing result as the order price snapshot. Coupon redemption should happen atomically with order confirmation.

---

# Design Rules

Do not put `ratePlanId` on Catalog `RentalOffer`. Do not price `EquipmentType` or combo components by default. Do not use JSON conditions/effects for the initial promotion model. Use SQL fields for known promotion features. Use `PromotionScope` and `PromotionExclusion` for targeting. Use `RentalOffer` scope for branch-specific discounts. Use `RentableItem` scope for item-wide discounts across branches. Use `RatePlanTier` for long-rental decreasing base prices. Use `Promotion` for discounts applied after base price. Do not create `CouponRedemption` during quote calculation. Create `CouponRedemption` atomically during order confirmation. Rental Commitment stores the accepted `PricingResult` snapshot.

---

# Do Not Reintroduce

Do not add pricing tiers directly to Catalog `RentalOffer`. Do not add `productTypeId` or `bundleId` to pricing tiers. Do not make Pricing query Catalog to discover package composition. Do not flatten packages into equipment lines for normal pricing. Do not let promotion scopes target old `ProductType`, `Bundle`, or `Combo`. Do not let confirmed order prices depend on live pricing rules. Do not count voided coupon redemptions toward usage limits.

---

# Open Questions

Should pricing ever support progressive tiers? Should package pricing ever calculate from components? Should multiple coupons per order be allowed later? Should promotion application stay priority-based or eventually use best-discount-wins? Should manual adjustments belong to Pricing or Rental Commitment order editing? Should taxes, fees, delivery, insurance, or deposits become price components later? Should Pricing keep read models of Catalog offer/item/category data for faster promotion matching?

---

# Final Summary

The pricing model separates base pricing from adjustments.

```text
Base pricing:
  Catalog RentalOffer
    -> RentalOfferPricing
      -> RatePlan
        -> RatePlanTier

Adjustments:
  Promotion
    -> PromotionScope / PromotionExclusion
  Coupon
    -> CouponRedemption
```

The calculator prices commercial selections, not equipment demand.

The final result is stored by Rental Commitment as a confirmed price snapshot.
