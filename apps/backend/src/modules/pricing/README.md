# Pricing Module

## Purpose

Pricing owns rental price calculation rules.

It answers what a proposed rental should cost, why it costs that amount, which billing policy applies, which rate plan was used, which tiers applied, and which promotions or coupons affected the result.

Pricing produces a price breakdown for a rental input. It does not own the rental lifecycle or the accepted historical price of a confirmed rental.

Once a rental is confirmed, the accepted price belongs to Rental Commitment as a snapshot.

Public API: `pricing.public-api.ts`

## Owns

```text
Rate plans
Rate plan tiers
Billing policies
Billing units
Rental-offer pricing assignments
Promotion rules
Promotion scopes
Promotion exclusions
Promotion effects
Coupon rules
Coupon validation
Price calculation
Price breakdown generation
Price explanation
```

Examples of questions owned by Pricing:

```text
Which rate plan prices this rental offer?
What billing unit applies?
How many billable units are charged?
Which tier applies for the charged duration or quantity?
What is the base subtotal?
Which promotions apply?
Is this coupon valid?
What is the discount total?
What is the final total?
Why did the calculation produce this result?
```

## Does Not Own

```text
Rental lifecycle
Rental confirmation
Draft/pending/confirmed rental status
Rental selections after commitment
Rental demand lines
Assigned assets
Asset availability
Asset blocks
Physical asset metadata
Catalog visibility
Catalog rentability
Rentable item presentation
Tenant permissions
Branch schedules
Contract generation
Signing state
Notification delivery
Accepted historical rental price snapshots
Owner payout snapshots for confirmed rentals
```

Pricing may reference catalog-owned entities such as `RentalOffer` or `RentableItem` for pricing scope, but Rental Catalog owns those source records.

Pricing may calculate a price for selected commercial items, but it must not decide whether the required assets are physically available.

## Dependencies

Pricing may depend on Tenant Management for tenant-level validation, currency defaults, allowed billing units, product mode, or permission checks in admin pricing workflows.

Pricing may reference Rental Catalog identifiers such as `rentalOfferId` or `rentableItemId`, but Pricing should not depend on Rental Catalog internals for calculation logic.

Rental Commitment depends on Pricing to calculate or validate proposed rental prices before confirmation or price-affecting edits.

Offering Setup may coordinate Pricing with Rental Catalog and Asset Inventory when creating rentable equipment, packages, offers, and pricing assignments.

## Key Domain Concepts

### Rate Plan

A rate plan is a reusable pricing policy.

It defines how a rental offer is priced.

A rate plan may include:

```text
name
currency
billing unit
daily billing policy
active/inactive state
tiers
```

Rate plans are reusable. Multiple rental offers may use the same rate plan.

Because rate plans can be shared, editing an existing rate plan can affect multiple offers. Admin workflows should warn users when they are editing a shared rate plan.

### Billing Unit

The billing unit defines what unit the rate plan charges by.

Examples:

```text
day
hour
week
fixed rental period
```

The actual billing unit used for a calculation belongs to Pricing through the rate plan.

Tenant configuration may define defaults or allowed billing units, but it is not the final source of truth for a specific price calculation.

### Daily Billing Policy

A daily billing policy defines how partial days are charged when the rate plan bills by day.

Examples:

```text
Ignore partial day
Bill over half day
Bill any partial day
```

The policy belongs to the rate plan because it affects price calculation.

### Rate Plan Tier

A tier defines how much a billing unit costs for a range of units.

Example:

```text
1-3 days: 100 per day
4-7 days: 80 per day
8+ days: 60 per day
```

Tiers belong to a rate plan.

Tier ranges must be coherent and should not overlap within the same rate plan.

### Rental Offer Pricing

Rental offer pricing connects a catalog-owned rental offer to a pricing-owned rate plan.

Rental Catalog owns the `RentalOffer`.

Pricing owns the pricing assignment for that offer.

A rental offer may exist without active pricing during setup, but it should not be considered fully bookable until pricing is configured.

### Promotion

A promotion is a pricing rule that modifies the calculated price.

A promotion may apply to a rentable item, a rental offer, an order, a tenant, a date range, or another explicit scope supported by the current schema.

Promotion effects should be explicit and queryable. Avoid hiding core pricing behavior in unstructured JSON unless the rule is intentionally flexible and well-contained.

### Coupon

A coupon is a code or token that allows a customer or staff member to apply a pricing rule.

Pricing owns coupon validation, expiration, usage constraints, and the effect of applying the coupon.

Rental Commitment may snapshot the accepted coupon code and applied discount in the confirmed price snapshot.

### Price Breakdown

A price breakdown is the structured explanation of the calculation result.

It should answer:

```text
What was priced?
Which rate plan was used?
How many units were charged?
Which tier applied?
What was the subtotal?
Which discounts applied?
What was the total?
```

Pricing produces the breakdown. Rental Commitment stores the accepted breakdown as a confirmed price snapshot.

## Lifecycle / State Rules

```text
Inactive rate plans should not be used for new rental confirmations.
Deleted or archived rate plans should not be used for new rental confirmations.
Inactive rental-offer pricing assignments should not make an offer bookable.
Expired promotions should not apply to new calculations.
Expired coupons should not validate for new calculations.
Pricing changes affect future calculations, not confirmed rental price snapshots.
```

Rate plans can be shared. Editing shared pricing rules must be treated as a potentially broad change.

If an admin wants a pricing change to apply only to one offer, prefer duplicating or creating a new rate plan instead of editing a shared one.

## Persistence Ownership

Pricing owns tables related to:

```text
rate plans
rate plan tiers
rental-offer pricing assignments
promotions
promotion scopes
promotion exclusions
promotion effects
promotion conditions
coupons
coupon usage / redemption tracking when implemented
```

Likely owned table concepts:

```text
v2_rate_plans
v2_rate_plan_tiers
v2_rental_offer_pricings
v2_promotions
v2_promotion_scopes
v2_promotion_exclusions
v2_promotion_effects
v2_coupons
```

Examples of external references:

```text
RentalOfferPricing may reference a RentalOffer owned by Rental Catalog.
Promotion scope may reference a RentableItem owned by Rental Catalog.
Promotion scope may reference a RentalOffer owned by Rental Catalog.
Pricing records may reference tenantId owned by Tenant Management.
Rental Commitment may snapshot pricing results when confirming rentals.
```

## Important Invariants

Pricing owns current pricing rules, not accepted historical rental prices.

Rental Commitment owns the confirmed price snapshot.

A confirmed rental must not recalculate its accepted price from current pricing rules.

Pricing must not inspect asset availability or asset blocks to calculate price.

Pricing must not decide whether a rental can be physically fulfilled.

Rental Catalog visibility does not imply active pricing.

Rental Catalog rentability does not imply active pricing.

A rental offer should not be considered fully bookable unless it has an active pricing assignment and an active rate plan.

The billing unit used for calculation belongs to the rate plan, not to tenant configuration.

Rate plan tiers must not overlap within the same rate plan.

Rate plan tier ranges must be valid and positive.

Price calculation should return a structured breakdown, not only a final total.

Applied promotions and coupons must be represented in the price breakdown so Rental Commitment can snapshot what was accepted.

Do not store durable order price state in Pricing.

Do not calculate owner payouts from current pricing rules after confirmation. If owner payout matters, Rental Commitment must preserve owner split snapshots.

## Events / Side Effects

Possible event categories include:

```text
Rate plan changes
Rate plan tier changes
Rental-offer pricing assignment changes
Promotion changes
Coupon changes
```

Pricing changes should not automatically rewrite confirmed rentals.

If a pricing change affects draft or pending rentals, the consuming workflow should explicitly decide whether to recalculate, warn, or preserve the previous quote.

Pricing should not directly confirm rentals, assign assets, generate contracts, or send notifications.

## Common Mistakes

Do not store confirmed rental price snapshots in Pricing.

Do not make Rental Commitment query Pricing tables to reconstruct confirmed prices.

Do not make Pricing inspect Asset Inventory or Rental Commitment asset blocks for availability.

Do not put catalog visibility, rentable item status, or branch offer state in Pricing.

Do not move RentalOffer ownership into Pricing.

Do not treat tenant `defaultBillingUnit` as the billing unit for a specific calculation.

Do not edit shared rate plans without considering all rental offers that use them.

Do not hide core promotion behavior inside opaque JSON when the rule has first-class domain meaning.

Do not let pricing changes silently mutate confirmed rental documents, confirmed rental snapshots, or signed contracts.

Do not put owner payout truth in Pricing unless the owner compensation boundary is explicitly redesigned.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/catalog/README.md
apps/backend/src/modules/rental-commitment/README.md
pricing.public-api.ts
```
