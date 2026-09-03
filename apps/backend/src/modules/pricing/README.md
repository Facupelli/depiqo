# Pricing Module

Pricing owns the current rules used to calculate rental prices.

It determines what a proposed rental should cost, how that amount was calculated, which rate plan and tiers applied, and which promotions or coupons affected the result.

Pricing does not own the accepted historical price of a confirmed rental. Rental Commitment preserves that as a snapshot.

## Published Capabilities

Pricing publishes cohesive synchronous capabilities for other modules:

- `PricingRatePlanAuthoring` creates reusable Rate Plans.
- `PricingRentalOfferPricingAssignment` assigns an active Pricing Rate Plan to a Catalog Rental Offer reference.
- `PricingCalculation.calculateProposedPrice` calculates a current proposed price from Pricing-owned assignments, rate plans, promotions, coupons, Pricing-owned fixed duration defaults, caller-provided effective timezone and tenant-selected daily billing policy, optional equipment target-total math, and the tenant's current insurance offering terms. It returns equipment pricing, insurance composition, and the insurance-inclusive proposed total. `calculateInsuranceForEquipmentPrice` recomposes only insurance from persisted equipment pricing when a consumer must not reprice equipment. Consumers translate these provider results into their own domain concepts.

The authoring capabilities publish Pricing-owned inputs, result IDs, error vocabularies, and billing-unit values. They do not expose Prisma, persistence, domain, or feature-local types.


## Domain Concepts

### Rate Plan

A `RatePlan` is a reusable pricing policy that defines how rental offers are priced.

It may define:

```text
name
currency
billing unit
daily billing policy
active state
tiers
```

Multiple rental offers may share the same rate plan.

Because rate plans are reusable, editing one may affect multiple offers.

### Billing Unit

The billing unit defines what unit a rate plan charges by.

Examples include:

```text
day
hour
week
fixed rental period
```

The billing unit used for a specific calculation comes from the rate plan.

Tenant configuration may provide defaults or allowed billing units, but it is not the source of truth for a specific calculation.

### Daily Billing Policy

A daily billing policy defines how partial days are charged for rate plans that bill by day.

Supported policy concepts include:

```text
Ignore partial day
Bill over quarter day
Bill over half day
Bill any partial day
```

`Bill over quarter day` charges an additional day only when the remaining elapsed duration is strictly greater than 6 hours. A remainder of exactly 6 hours does not add a day.

Daily billing remains elapsed-duration based. When the tenant enables `weekendCountsAsOne`, Pricing uses the effective branch timezone only to find Saturday-Sunday pairs with positive rental-interval overlap on both local dates. Each qualifying pair reduces the normally calculated day charge by one, never below the minimum charged days. It does not attach elapsed 24-hour units to calendar dates or change the partial-day policy. This adjustment applies only to `DAY` rate plans. `HOUR` and `WEEK` rate plans remain unchanged.

With `BILL_ANY_PARTIAL_DAY` and weekend mode enabled:

```text
Sat 10:00 -> Sun 18:00 = 1 charged day
Sat 10:00 -> Sun 10:00 = 1 charged day
Sat 10:00 -> Mon 10:00 = 1 charged day
Fri 10:00 -> Mon 10:00 = 2 charged days
```

### Rate Plan Tier

A tier defines the price of a billing unit for a range of units.

Example:

```text
1-3 days: 100 per day
4-7 days: 80 per day
8+ days: 60 per day
```

Tiers belong to a rate plan.

Tier ranges must be valid, positive, coherent, and non-overlapping within the same plan.

### Rental Offer Pricing

Rental offer pricing connects a catalog-owned `RentalOffer` to a pricing-owned `RatePlan`.

Rental Catalog owns the offer.

Pricing owns the pricing assignment.

An offer may exist without active pricing during setup, but it is not fully bookable until its pricing assignment and rate plan are active.

### Promotion

A promotion is a pricing rule that modifies a calculation.

A promotion can qualify from and financially affect only the lines inside its resolved scope after exclusions.

```text
scope
  determines the candidate participating lines

exclusions
  remove lines from that scope

conditions
  are evaluated from those eligible lines

effect
  is calculated from and allocated only to those eligible lines
```

A whole-order promotion uses `scope = ALL` with no exclusions.

Promotion behavior with first-class domain meaning should remain explicit and queryable rather than being hidden inside opaque JSON.

### Coupon

A coupon is a code or token used to apply a pricing rule.

Pricing owns coupon validation, expiration, usage constraints, and its pricing effect.

Rental Commitment may preserve the accepted coupon and discount in the confirmed price snapshot.

### Price Breakdown

A price breakdown is the structured explanation of a pricing result.

It should preserve enough information to explain:

```text
what was priced
which rate plan was used
how many units were charged
which tier applied
the base subtotal
applied promotions and coupons
discount totals
final total
```

Pricing produces the breakdown. Insurance is calculated from the pre-discount equipment subtotal. A manual target-total adjustment changes equipment pricing only; insurance remains a separate charge in the composed proposed total.

Rental Commitment stores the accepted breakdown and insurance composition when the rental price becomes historical truth.

## Business Rules

Inactive, archived, or deleted rate plans must not be used for new rental confirmations.

Inactive rental-offer pricing assignments must not make an offer bookable.

Expired promotions must not apply to new calculations.

Expired coupons must not validate for new calculations.

Pricing changes affect future calculations, not confirmed rental price snapshots.

A confirmed rental must not recalculate its accepted price from current pricing rules.

Price calculation must return a structured breakdown rather than only a final total.

Applied promotions and coupons must be represented in that breakdown so the accepted calculation can be preserved.

Rate plans may be shared across offers. Editing a shared rate plan must therefore be treated as a potentially broad change.

If an admin intends a pricing change to affect only one offer, prefer creating or duplicating a rate plan rather than modifying a shared one.

A rental offer is not fully bookable unless it has both an active pricing assignment and an active rate plan.

Rental Catalog visibility or rentability does not imply that active pricing exists.

Pricing changes must not silently mutate confirmed rental snapshots, documents, or signed contracts.

## Boundaries

Rental Catalog owns `RentalOffer`, `RentableItem`, catalog visibility, rentability, and branch offer state.

Pricing may reference catalog-owned identifiers for pricing scope and assignments but must not take ownership of those records.

The current rental-offer pricing-assignment implementation directly reads Catalog-owned `v2RentalOffer` persistence to validate the reference. This is an existing deferred cross-module boundary violation. It remains intentionally unchanged while public module boundaries are cleaned up and must be addressed separately through the appropriate Catalog collaboration mechanism.

Pricing must not depend on Rental Catalog internals for calculation logic.

Pricing does not determine physical availability. It must not inspect assets or rental-created asset blocks when calculating a price.

Rental Commitment owns rental lifecycle and the accepted historical price snapshot.

Rental Commitment may call Pricing to calculate or validate proposed prices before confirmation or price-affecting edits, but it must not reconstruct confirmed prices from current Pricing records.

Tenant Management may provide tenant validation, currency defaults, allowed billing units, product mode, or permission context for admin pricing workflows.

Offering Setup may coordinate Pricing with Rental Catalog and Asset Inventory when setting up rentable offerings.

Pricing must not directly confirm rentals, assign assets, generate contracts, or send notifications.

Owner payout truth does not belong to Pricing. When historical owner compensation matters, Rental Commitment preserves the corresponding snapshot.

## Persistence

Pricing owns persistence for:

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
coupon usage or redemption tracking when implemented
```

Confirmed rental price snapshots and owner payout snapshots are persisted by Rental Commitment rather than Pricing.

## References

* `public-api/pricing-calculation.public-api.ts
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`
* `apps/backend/src/modules/tenant-management/README.md`
* `apps/backend/src/modules/catalog/README.md`
* `apps/backend/src/modules/rental-commitment/README.md`
