# Pricing

Pricing owns the tenant's current proposed rental pricing rules and calculations. It determines proposed prices, while Rental Commitment owns pricing once it is accepted as part of a rental's historical facts. Current Pricing configuration is not itself historical rental truth.

## Domain concepts

### Rate Plan

A Rate Plan is a reusable pricing policy that can be used by multiple Rental Offers. Changing a shared Rate Plan may therefore affect the proposed pricing of multiple offers.

### Rental Offer Pricing

Catalog owns the commercial Rental Offer. Pricing owns the association between an offer and the pricing policy used to calculate its proposed price. An offer being visible or rentable in Catalog does not by itself establish that a valid proposed price can be calculated.

## Billing semantics

Rental duration is converted into charged units according to the pricing policy. Daily billing is based on elapsed duration rather than a count of calendar dates, and partial-day behavior follows the configured tenant billing policy. Where a policy uses a partial-day threshold, the comparison is strict: the elapsed remainder must exceed the threshold to add a charged day.

Weekend adjustment applies only to daily billing. Weekend evaluation uses the effective branch timezone and requires positive rental overlap with both the local Saturday and Sunday. The adjustment cannot reduce the charged-day result below the minimum charged-day floor.

## Promotions

Promotions modify proposed prices. Promotion scope determines which pricing lines are candidates; exclusions remove lines from that scope. Promotion conditions and effects operate on the resulting eligible lines. A promotion may apply automatically or require a coupon.

A coupon is a customer-supplied token used to activate a coupon-required promotion.

## Price composition and accepted pricing

Pricing produces an explainable proposed result rather than only a final total. Insurance is calculated from the pre-discount equipment subtotal. A manual target-total adjustment changes the equipment-pricing portion while insurance remains separately composed.

Pricing proposes current prices. Rental Commitment owns the accepted pricing facts of a rental, and changes to current Pricing configuration do not directly mutate those historical facts. Supported Rental Commitment edit workflows may intentionally request a new Pricing calculation and accept updated pricing facts.

## Boundaries

- Catalog owns the commercial Rental Offer; Pricing owns its proposed pricing.
- Tenant Management supplies tenant and branch inputs needed by Pricing, such as the effective timezone, billing preferences, and insurance offering terms.
- Rental Commitment owns accepted historical rental pricing.
- Pricing does not determine physical asset availability.
