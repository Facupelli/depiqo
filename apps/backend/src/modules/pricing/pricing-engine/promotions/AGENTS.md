# Promotion Engine Guide

## Model

A promotion changes a proposed rental price.

```text
activation: AUTOMATIC | COUPON_REQUIRED
effect: PERCENTAGE_OFF | FIXED_AMOUNT_OFF
target: ORDER | ELIGIBLE_LINES
```

A promotion also has priority, stackability, active state, an optional inclusive local-date window, optional order-subtotal and charged-unit limits, scopes, and exclusions.

Scopes and exclusions match rental offer, rentable item, or category. A scope can instead match every line.

## Calculation flow

`RentalPricingService.calculate` does this:

1. Price base rental lines.
2. Find eligible automatic promotions.
3. Validate the optional coupon and find its linked promotion.
4. Combine candidates and sort them by descending priority.
5. Apply candidates in order.
6. Stop after an applied non-stackable promotion.
7. Allocate each discount to lines and assemble the result snapshot.

A coupon promotion is a candidate in the same plan as automatic promotions. Its priority and `stackable` value control how it combines with them.

## Eligibility

`PromotionEligibilityService` requires all of these:

- Same tenant, active state, and requested activation type.
- Calculation local date in the inclusive validity window.
- Original order subtotal meets `minOrderSubtotal`, when set.
- The greatest `chargedUnits` value of any line is within the optional rental-unit range.
- At least one line matches a scope and no exclusion.

`CouponValidationService` also requires a submitted matching, active coupon in its own inclusive validity window. It enforces coupon customer restrictions and redemption limits. An invalid or inapplicable supplied coupon fails pricing.

## Discount semantics

- `PERCENTAGE_OFF` must be greater than 0 and at most 100.
- `FIXED_AMOUNT_OFF` must be greater than 0.
- `ORDER` calculates from the current order total and allocates the result across all lines.
- `ELIGIBLE_LINES` calculates from, and allocates to, only eligible lines.
- Scope only determines whether a promotion qualifies. An `ORDER` promotion with one scoped eligible line discounts the whole order.
- Each later promotion calculates from the already-discounted current totals.
- Discount calculation and allocation clamp amounts to prevent negative line or order totals.
- Allocation is proportional to the current line totals, with money-safe rounding.

## Result

Applied adjustments are stored per line. The final result also records applied promotion snapshots and, when applicable, the applied coupon snapshot. Consumers preserve this breakdown as historical accepted pricing.

## Change map

| Change | Primary code |
| --- | --- |
| Eligibility condition | `promotion-elegibility.service.ts` |
| Scope or exclusion matcher | `promotion-scope-matcher.ts` |
| Discount effect | `promotion-discount-calculator.ts`, `promotion.types.ts` |
| Discount target or allocation | `discount-allocation.service.ts`, `promotion.types.ts` |
| Priority or stacking rule | `promotion-application-planner.ts` |
| Coupon validation | `../coupons/coupon-validation.service.ts` |
| Applied result shape | `applied-promotion.type.ts`, `../final/pricing-result.type.ts` |

For a new first-class capability, update the engine types, persistence, API contracts, backend authoring features, and Backoffice form together. Do not add opaque promotion-rule JSON.
