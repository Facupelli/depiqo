# Offering Setup Module

## Purpose

Offering Setup coordinates tenant-admin setup workflows that span multiple modules.

It exists because common admin actions often require creating or connecting records across Tenant Management, Asset Inventory, Rental Catalog, and Pricing.

For example, when a tenant admin creates rentable equipment, the system may need to create an equipment type, optional physical assets, a rentable item, fulfillment requirements, branch rental offers, and pricing assignments. No single bounded context owns that entire workflow.

Offering Setup is not a bounded context. It is an orchestration module.

Public API: `offering-setup.public-api.ts`

## Owns

```text
Cross-module setup workflows
Tenant-admin setup orchestration
Setup command/request coordination
Setup workflow transaction boundaries when required
Setup workflow input validation that is not domain ownership
Mapping user intent into module-specific public API calls
Setup workflow response composition
```

Examples of setup workflows coordinated here:

```text
Create rentable equipment
Create internal-only equipment
Create package / kit
Make existing equipment rentable
Add physical assets as part of a setup flow
Connect rental offers to pricing setup
```

Offering Setup owns the application workflow, not the domain records created by that workflow.

The created records still belong to their owning modules.

## Does Not Own

Offering Setup should not own core business tables or domain records from:

```text
Tenant Management
Asset Inventory
Rental Catalog
Pricing
Rental Commitment
Contracts
Notifications
```

It must not take ownership of tenant data, catalog data, inventory data, pricing data, rentals, contracts, or notifications.

Examples:

```text
Offering Setup may coordinate EquipmentType creation.
Asset Inventory owns the equipment type.

Offering Setup may coordinate RentableItem creation.
Rental Catalog owns the rentable item.

Offering Setup may coordinate RatePlan creation.
Pricing owns the rate plan.
```

## Dependencies

Offering Setup depends on public capabilities from other modules.

It may call Tenant Management to validate tenant, tenant user, branch, permissions, product mode, and setup capabilities.

It may call Asset Inventory to create or validate equipment types, assets, ownership data, and equipment-type accessory defaults.

It may call Rental Catalog to create rentable items, fulfillment requirements, categories when needed, and branch rental offers.

It may call Pricing to create or reuse rate plans, tiers, and rental-offer pricing assignments.

Offering Setup should not depend on Rental Commitment, Contracts, or Notifications for normal offering setup workflows.

## Key Domain Concepts

### Setup Workflow

A setup workflow is an application-level admin action that coordinates multiple bounded contexts.

It represents user intent, not a new domain aggregate.

Example user intent:

```text
I want this equipment to be rentable in these branches with this pricing.
```

That intent may require work in multiple modules:

```text
Tenant Management
  Validate tenant user, permissions, branches, product mode

Asset Inventory
  Create or validate equipment type and assets

Rental Catalog
  Create rentable item, requirements, and rental offers

Pricing
  Create or reuse rate plan and pricing assignments
```

Offering Setup coordinates those calls, but the created records remain owned by the target modules.

### Rentable Equipment Setup

Rentable equipment setup is the admin workflow for creating equipment that can be selected in rental flows.

The workflow usually coordinates:

```text
EquipmentType
Physical assets, if provided
Accessory defaults, if provided
RentableItem
FulfillmentRequirement
RentalOffer
RatePlan or pricing assignment
```

Standalone rentable equipment still requires both an operational equipment type and a catalog rentable item.

Asset Inventory owns the equipment type and assets.

Rental Catalog owns the rentable item, requirements, and offers.

Pricing owns the pricing setup.

### Setup Result

A setup result is a composed response returned to the admin UI.

It may include identifiers or summaries from multiple modules.

The setup result is not a persisted domain object unless a specific setup history/audit feature is introduced later.

## Persistence Ownership

Offering Setup should usually be persistence-free.

If setup audit, idempotency, or workflow history is added later, those records should represent the orchestration attempt, not ownership of records created by other modules.

Cross-module records created during setup remain owned by their modules.

Examples:

```text
Created EquipmentType
  owned by Asset Inventory

Created Asset
  owned by Asset Inventory

Created RentableItem
  owned by Rental Catalog

Created FulfillmentRequirement
  owned by Rental Catalog

Created RentalOffer
  owned by Rental Catalog

Created RatePlan
  owned by Pricing

Created RentalOfferPricing
  owned by Pricing
```

## Important Invariants

Offering Setup is an orchestration module, not a bounded context.

Offering Setup must not become a god module for tenant-admin operations.

Offering Setup must not own the data it coordinates.

Offering Setup must not enforce domain invariants that belong to Tenant Management, Asset Inventory, Rental Catalog, or Pricing.

Tenant and permission validation must happen before setup work is performed.

Branch references must be validated through Tenant Management.

Equipment type and asset rules must be validated through Asset Inventory.

Rentable item, rental offer, and fulfillment requirement rules must be validated through Rental Catalog.

Rate plan, tier, promotion, coupon, and pricing assignment rules must be validated through Pricing.

A package setup must create package fulfillment requirements against equipment types, not child rentable items.

A standalone rentable equipment setup must not treat `EquipmentType` as the customer-selected catalog item. The selectable item is the rental offer for a rentable item.

A setup workflow must not mark an offer as ready/bookable if required catalog, pricing, or inventory setup is missing.

Adding assets should not mutate catalog definitions or pricing rules unless the workflow explicitly includes those changes.

Setup workflows must not create rental commitments, assigned assets, or asset blocks.

Setup workflows must not generate contracts or signing requests.

Setup workflows must not send notifications directly unless the workflow explicitly delegates delivery through Notifications.

## Events / Side Effects

Offering Setup may emit setup-level events only when there is a real workflow need.

Possible event categories include:

```text
Offering setup completed
Offering setup failed
Rentable equipment setup completed
Package setup completed
Existing equipment made rentable
```

Most domain events should come from the modules that own the changed facts.

Examples:

```text
Asset Inventory emits inventory-owned events.
Rental Catalog emits catalog-owned events.
Pricing emits pricing-owned events.
Tenant Management emits tenant-owned events.
```

Offering Setup may trigger side effects by calling public capabilities from other modules, but provider-specific side effects should remain inside the owning module or infrastructure adapter.

## Common Mistakes

Do not turn Offering Setup into a bounded context.

Do not put catalog, inventory, pricing, tenant, rental, contract, or notification tables under Offering Setup ownership.

Do not bypass public APIs from owning modules.

Do not put business rules from other modules inside Offering Setup just because the setup workflow touches them.

Do not make Offering Setup the authority over whether an equipment type is valid.

Do not make Offering Setup the authority over whether a rental offer is selectable.

Do not make Offering Setup the authority over whether a rate plan is valid.

Do not make Offering Setup the authority over whether a tenant user has permission.

Do not model packages as child rentable items.

Do not reintroduce old rental selection shapes such as selected equipment types plus selected combos.

Do not create asset blocks during setup.

Do not generate contracts from setup workflows.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/asset-inventory/README.md
apps/backend/src/modules/catalog/README.md
apps/backend/src/modules/pricing/README.md
apps/backend/src/modules/rental-commitment/README.md
offering-setup.public-api.ts
```
