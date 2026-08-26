# Offering Setup Module

Offering Setup coordinates tenant-admin setup workflows that span multiple modules.

It translates an admin's setup intent into calls to the public capabilities of Tenant Management, Asset Inventory, Rental Catalog, and Pricing.

Offering Setup is an orchestration module, not a bounded context. It owns the workflow, not the domain records created by it.

Public API: `offering-setup.public-api.ts`

## Domain Concepts

### Setup Workflow

A setup workflow is an application-level admin action that coordinates multiple bounded contexts.

It represents user intent such as:

```text
I want this equipment to be rentable in these branches with this pricing.
```

That may require coordination across:

```text
Tenant Management
  Validate tenant user, permissions, branches, product mode

Asset Inventory
  Create or validate equipment types, assets, ownership, accessory defaults

Rental Catalog
  Create rentable items, fulfillment requirements, categories, rental offers

Pricing
  Create or reuse rate plans, tiers, and pricing assignments
```

The resulting records remain owned by those modules.

### Rentable Equipment Setup

Rentable equipment setup coordinates the records required to make equipment available through rental flows.

It may include:

```text
EquipmentType
Physical assets
Accessory defaults
RentableItem
FulfillmentRequirement
RentalOffer
RatePlan or pricing assignment
```

Standalone rentable equipment still has both an operational `EquipmentType` and a catalog `RentableItem`.

The customer-selectable entity is the `RentalOffer` for that rentable item.

### Setup Result

A setup result is the composed response returned to the admin UI.

It may contain identifiers or summaries from multiple modules.

It is not a persisted domain object unless a dedicated setup history or audit capability is introduced.

## Business Rules

Offering Setup must remain an orchestration module and must not become a bounded context or general-purpose tenant-admin god module.

It must not own domain data created during setup.

It must not duplicate or enforce domain invariants owned by the modules it coordinates.

Tenant and permission validation must happen before setup work is performed.

Branch rules must be validated through Tenant Management.

Equipment type, asset, ownership, and accessory-default rules must be validated through Asset Inventory.

Rentable item, rental offer, and fulfillment requirement rules must be validated through Rental Catalog.

Rate plan, tier, promotion, coupon, and pricing-assignment rules must be validated through Pricing.

A package setup creates fulfillment requirements against equipment types, not child rentable items.

A standalone rentable equipment setup must not treat `EquipmentType` as the customer-selected catalog item.

A setup workflow must not mark an offer as ready or bookable when required catalog, pricing, or inventory setup is missing.

Adding assets must not implicitly mutate catalog definitions or pricing rules unless those changes are explicitly part of the workflow.

Setup workflows must not create rental commitments, assigned assets, or asset blocks.

Setup workflows must not generate contracts or signing requests.

Setup workflows must not send notifications directly unless they explicitly delegate delivery through Notifications.

## Boundaries

Tenant Management owns tenant data, users, permissions, branches, product mode, and tenant setup capabilities.

Asset Inventory owns equipment types, physical assets, ownership metadata, and equipment-type accessory defaults.

Rental Catalog owns rentable items, fulfillment requirements, categories, and rental offers.

Pricing owns rate plans, tiers, promotions, coupons, and rental-offer pricing assignments.

Offering Setup may coordinate creation or validation of those records, but it must use the owning module's public capabilities rather than bypassing module boundaries.

Offering Setup should not depend on Rental Commitment, Contracts, or Notifications for normal offering setup workflows.

It must not become authoritative over whether an equipment type, rental offer, rate plan, or tenant permission is valid.

## Persistence

Offering Setup should normally be persistence-free.

Records created during a setup workflow remain persisted by their owning modules.

If setup audit, idempotency, or workflow history is introduced later, those records should describe the orchestration attempt rather than duplicate ownership of the resulting domain data.

## Events / Side Effects

Most domain events should be emitted by the modules that own the changed facts.

Offering Setup may emit setup-level events when the workflow itself has meaningful state, such as setup completion or failure.

Provider-specific side effects remain inside the owning module or infrastructure adapter.

## References

* `offering-setup.public-api.ts`
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`
* `apps/backend/src/modules/tenant-management/README.md`
* `apps/backend/src/modules/asset-inventory/README.md`
* `apps/backend/src/modules/catalog/README.md`
* `apps/backend/src/modules/pricing/README.md`
* `apps/backend/src/modules/rental-commitment/README.md`
