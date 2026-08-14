# Pricing

## Meaning

The Pricing module owns the Backoffice experience for managing the reusable rules the business uses to calculate rental prices.

It represents the tenant-facing intent:

> Manage how I charge for rentals.

Pricing defines the current rules used when calculating a proposed rental price.

It does not own the agreed historical price of a specific confirmed Rental.

The module should use commercial language familiar to rental businesses and make pricing behavior understandable without exposing backend calculation or persistence concepts.

## Tenant-facing responsibilities

Pricing is the primary area for managing reusable pricing configuration.

It may include capabilities such as:

```text
view price plans
create price plans
edit price plans
archive or deactivate price plans
configure billing units
configure prices by duration
review which Products use a price plan
configure promotions
configure coupons
review pricing configuration
```

The exact capabilities available depend on the implemented Pricing domain.

Do not expose low-level pricing entities merely because they exist in backend persistence.

Prefer workflows centered around questions such as:

```text
How much do I charge?
How does the price change with rental duration?
Which Products use this pricing?
What discounts are currently available?
```

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                         Backoffice

RatePlan                        Price plan
RatePlanTier                    Prices by duration / Pricing tiers
BillingUnit                     Billing unit
DailyBillingPolicy              Partial-day charging
RentalOfferPricing              Product pricing
Promotion                       Promotion
Coupon                          Coupon
PriceBreakdown                  Price breakdown
PricingCalculation              Price calculation
```

Concepts such as the following should normally remain invisible:

```text
pricing assignment as an entity
promotion scopes as persistence records
promotion conditions as persistence records
promotion effects as persistence records
calculation provider contracts
snapshot schema/version
backend authoring capability names
persistence model names
```

Expose their commercial meaning rather than their implementation terminology.

## Core concepts and workflows

### Price plans

A Price Plan is a reusable set of rules describing how rental Products are priced.

For example:

```text
Camera Daily Pricing

Billing:
  Per day

Prices:
  1–3 days    $100/day
  4–7 days     $80/day
  8+ days      $60/day
```

A Price Plan may be shared by several Products.

This reuse is useful and should remain visible to tenant users when it affects their decisions.

For example:

> This Price Plan is used by 8 Products. Changes will affect all of them.

Do not hide this impact when editing shared pricing.

If a tenant wants a change to affect only one Product, the UI may guide them toward creating or duplicating a Price Plan rather than silently changing a shared one.

### Billing units

A Price Plan determines how rental time is charged.

Possible billing concepts may include:

```text
Per day
Per hour
Per week
Fixed rental period
```

Only expose billing units currently supported by the product.

The billing unit used for a Product's price calculation comes from its Price Plan.

Do not imply that a global tenant preference overrides the Price Plan used for a specific calculation.

Use natural UI language such as:

```text
Charge by
Billing
Price per
```

instead of backend enum terminology where appropriate.

### Prices by duration

A Price Plan may change its unit price depending on rental duration.

For example:

```text
1–3 days
  $100 per day

4–7 days
  $80 per day

8+ days
  $60 per day
```

Present these rules as understandable duration ranges.

Do not expose database-oriented concepts such as tier records or range persistence unless they are directly useful to the tenant.

The UI should prevent or clearly explain invalid pricing configurations such as:

```text
overlapping ranges
missing required ranges
negative prices
invalid duration boundaries
```

Validation belongs to the backend Pricing domain, but the frontend should communicate validation errors in pricing language.

### Partial-day charging

For day-based pricing, the tenant may configure how partial days are charged when supported.

Use language that explains the business effect directly.

For example:

```text
Ignore partial days
Charge when more than half a day is used
Charge any partial day as a full day
```

Avoid exposing enum names or backend policy identifiers.

If a tenant-level default exists, make clear whether the Price Plan uses that default or defines its own applicable behavior according to the implemented domain.

### Product pricing

Products use Price Plans.

From the tenant's perspective, this can be expressed as:

```text
Sony FX3 Camera
  Pricing: Camera Daily Pricing
```

The backend may represent this through a pricing assignment to a branch-specific Product offer.

The Backoffice should not expose that assignment as a standalone entity.

There are two related frontend intents:

```text
Choose how this Product is priced
  → Products

Manage the reusable Camera Daily Pricing rules
  → Pricing
```

Both may interact with the same backend Pricing capabilities.

The frontend module boundary is determined by user intent rather than backend ownership.

### Branch-specific pricing

If the same Product can use different pricing in different branches, present that in Product or Pricing language.

For example:

```text
Sony FX3 Camera

Main Branch
  Camera Daily Pricing

Downtown Branch
  Downtown Camera Pricing
```

Do not expose `RentalOfferPricing` or `RentalOffer` merely to explain this relationship.

Use Branch and Product concepts that the tenant already understands.

### Promotions

Promotions modify proposed pricing according to configured rules.

Use tenant-facing concepts such as:

```text
Promotion
Discount
Applies to
Valid from
Valid until
Discount amount
Discount percentage
```

Only expose scope and condition concepts that the product actually supports.

Do not collapse meaningful pricing behavior into opaque "advanced JSON" configuration.

When a promotion has first-class business meaning, the Backoffice should represent that meaning explicitly.

Expired or inactive promotions must not be presented as currently affecting new Rentals.

### Coupons

Coupons are codes that may apply a pricing rule during calculation.

Use straightforward concepts such as:

```text
Coupon code
Discount
Expiration
Usage limits
Active
```

Only expose constraints currently implemented by the backend.

A Coupon may affect the proposed price of a Rental.

Once that price becomes accepted historical Rental truth, later changes to the Coupon must not rewrite the agreed price.

### Price calculation and breakdown

Pricing should be explainable.

Where useful, the Backoffice may show how a proposed price was calculated.

For example:

```text
Sony FX3 Camera × 1
4 days

Camera Daily Pricing
4 × $80

Subtotal: $320
Promotion: -$32
Total: $288
```

The tenant should see the commercial explanation.

Do not expose calculation internals such as provider result types, schema identifiers, persistence structures, or internal translation layers.

A structured price breakdown is useful because it explains the proposed price.

### Current pricing and confirmed rental prices

Pricing owns current pricing rules.

Rentals owns the agreed historical price of a confirmed Rental.

This distinction must remain clear in the Backoffice.

For example:

```text
Current Camera Daily Pricing:
  $120/day

Rental #1042:
  Confirmed at $100/day
```

Changing the current Price Plan must not visually or behaviorally rewrite Rental #1042's confirmed price.

Likewise, opening an old Rental must not recalculate its agreed price using today's Pricing rules.

Use language such as:

> This Rental keeps the price that was confirmed at the time.

Do not expose `ConfirmedPriceSnapshot` terminology to normal users.

### Product bookability

A Product may exist and be available for rental in Catalog configuration while still lacking valid active Pricing.

The Backoffice should communicate setup incompleteness in simple language.

For example:

> Pricing needs to be configured before this Product can be booked.

Do not imply that:

```text
visible
available for rental
priced
physically available
```

are one state.

They represent different concerns.

## Backend relationships

The Pricing frontend module primarily composes the backend Pricing bounded context together with supporting Product and tenant facts.

These relationships do not define the frontend module boundary.

### Pricing

Pricing is the main backend owner of current pricing rules and calculations.

It owns:

```text
price plans
pricing tiers
billing units
partial-day charging rules
product-offer pricing assignments
promotions
coupons
current proposed price calculations
```

The Backoffice translates these into tenant-facing concepts such as:

```text
Price Plans
Prices by duration
Product pricing
Promotions
Coupons
Price breakdown
```

Pricing does not own the accepted historical price of a confirmed Rental.

### Rental Catalog

Rental Catalog owns the Products and branch-specific commercial offers that Pricing references.

Pricing may associate Price Plans with those Product offers.

The Backoffice should present this relationship using Product and Branch language rather than Catalog persistence terminology.

For example:

```text
Sony FX3 Camera
Main Branch
Price Plan: Camera Daily Pricing
```

rather than exposing pricing-assignment entities.

### Rental Commitment

Rental Commitment owns the accepted price of a confirmed Rental.

Pricing may calculate a proposed price before confirmation or during price-affecting edits.

Once accepted, that result becomes Rental history.

The Pricing module must not present confirmed Rentals as dynamically dependent on current Price Plans.

### Tenant Management

Tenant Management may provide supporting Pricing facts such as:

```text
tenant identity
permissions
billing preferences
allowed or default configuration
```

The Backoffice should translate those into tenant-facing Settings where appropriate.

A business-level pricing preference belongs to Settings when the user's intent is:

> Configure how my business behaves by default.

A reusable Price Plan belongs to Pricing when the user's intent is:

> Define how I charge for rentals.

### Offering Setup

Offering Setup may create or assign Pricing configuration as part of a broader Product setup workflow.

For example:

> Make Sony FX3 rentable at $100 per day.

may create or reuse a Price Plan and connect it to the Product behind one Products workflow.

Offering Setup remains invisible to tenant users.

The resulting reusable Price Plan remains manageable through Pricing.

## Frontend boundary

Code belongs in `src/modules/pricing/` when its primary tenant-facing intent is:

> Manage how I charge for rentals.

Use the user's intent to determine frontend ownership rather than the backend module providing the underlying data.

Examples:

```text
Create Camera Daily Pricing
  → Pricing

Change the 4–7 day rate
  → Pricing

See which Products use Camera Daily Pricing
  → Pricing

Create a seasonal promotion
  → Pricing

Create or disable a Coupon
  → Pricing

Choose Camera Daily Pricing for Sony FX3
  → Products

Set up a new Product with its initial price
  → Products

Review Rental #1042's confirmed price
  → Rentals

Manually adjust Rental #1042's agreed price
  → Rentals

Configure a business-wide billing preference
  → Settings
```

A Pricing feature may consume Product or tenant information when required to explain where pricing is used or validate configuration.

That is expected and does not violate the frontend module boundary.

Do not move pricing-specific behavior into shared locations merely because Products and Rentals also consume Pricing.

## Internal structure

Prefer vertical slices organized around tenant workflows.

Possible slices include:

```text
pricing/
  price-plans/
  create-price-plan/
  edit-price-plan/
  price-plan-detail/
  promotions/
  create-promotion/
  edit-promotion/
  coupons/
```

These are examples, not required folders.

A substantial nested business area may contain its own vertical slices.

For example:

```text
pricing/
  price-plans/
    list-price-plans/
    create-price-plan/
    price-plan-detail/
    edit-price-plan/
```

Do not introduce hierarchy only to classify files.

Create slices only when the corresponding capability actually exists.

Keep implementation local to its slice until several Pricing features genuinely need the same code.

Shared Pricing code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside the module through folders such as:

```text
pricing-domain/
catalog/
rental-commitment/
tenant-management/
offering-setup/
```

