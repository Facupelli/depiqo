# Promotion Engine Guide

## Model

A promotion changes a proposed rental price.

```text
activation: AUTOMATIC | COUPON_REQUIRED
effect: PERCENTAGE_OFF | FIXED_AMOUNT_OFF
````

A promotion also has priority, stackability, active state, an optional inclusive local-date window, optional subtotal and charged-unit limits, scopes, and exclusions.

Scopes and exclusions match rental offer, rentable item, or category. A scope can instead match every line.

Scope and exclusions define the promotion's eligible lines:

```text
scope
  determines candidate participating lines

exclusions
  remove lines from that scope

conditions
  evaluate those eligible lines

effect
  calculates from and allocates to those eligible lines
```

A whole-order promotion uses an all-lines scope with no exclusions.

## Calculation flow

`RentalPricingService.calculate` does this:

1. Price base rental lines.
2. Find eligible automatic promotions.
3. Validate the optional coupon and find its linked promotion.
4. Combine candidates and sort them by descending priority.
5. Apply candidates in order.
6. Stop after an applied non-stackable promotion.
7. Allocate each discount to eligible lines and assemble the result.

A coupon promotion is a candidate in the same plan as automatic promotions. Its priority and `stackable` value control how it combines with them.

## Eligibility

`PromotionEligibilityService` requires all of these:

* Same tenant, active state, and requested activation type.
* Calculation local date in the inclusive validity window.
* At least one line remains in the resolved scope after exclusions.
* The original subtotal of the eligible lines meets `minOrderSubtotal`, when set.
* The greatest `chargedUnits` value among the eligible lines is within the optional rental-unit range.

Eligibility conditions use original line values. Previous promotion discounts do not change whether another promotion qualifies.

`CouponValidationService` also requires a submitted matching, active coupon in its own inclusive validity window. It enforces coupon customer restrictions and redemption limits. An invalid or inapplicable supplied coupon fails pricing.

## Discount semantics

* `PERCENTAGE_OFF` must be greater than 0 and at most 100.
* `FIXED_AMOUNT_OFF` must be greater than 0.
* Each promotion calculates from and allocates only to its resolved eligible lines.
* Discount calculation uses the eligible lines' current totals.
* Each later promotion therefore calculates from totals left by earlier promotions.
* Fixed discounts are capped by the remaining eligible total.
* Discount calculation and allocation clamp amounts to prevent negative line or order totals.
* Allocation is proportional to the current eligible line totals, with money-safe rounding.

## Result

Applied adjustments are stored per line. The final result also records applied promotion information and, when applicable, the applied coupon snapshot.

Rental Commitment may preserve the accepted pricing breakdown as historical rental pricing.

## Change map

| Change                             | Primary code                                                         |
| ---------------------------------- | -------------------------------------------------------------------- |
| Eligibility condition              | `promotion-elegibility.service.ts`                                   |
| Scope or exclusion matcher         | `promotion-scope-matcher.ts`                                         |
| Discount effect                    | `promotion-discount-calculator.ts`, `promotion.types.ts`             |
| Discount calculation or allocation | `promotion-discount-calculator.ts`, `discount-allocation.service.ts` |
| Priority or stacking rule          | `promotion-application-planner.ts`                                   |
| Coupon validation                  | `../coupons/coupon-validation.service.ts`                            |
| Applied result shape               | `applied-promotion.type.ts`, `../final/pricing-result.type.ts`       |

For a new first-class capability, update the engine types, persistence, API contracts, backend authoring features, and Backoffice form together. Keep promotion behavior explicit in the domain model rather than encoding rules in opaque JSON.

