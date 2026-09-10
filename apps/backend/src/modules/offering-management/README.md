# Offering Management Module

Offering Management coordinates tenant-admin workflows for managing equipment and rental offerings.

It is an application and orchestration boundary, not a provider bounded context. It owns cross-context workflows and consumer-shaped administrative read models, but it does not own the provider domain data those workflows create or compose.

## Responsibilities

Offering Management supports:

- tenant-admin offering and equipment management workflows;
- cross-context orchestration across Asset Inventory, Catalog, Pricing, and Tenant Management;
- composed administrative read models needed to manage those offerings;
- translation of tenant-admin intent into calls to provider-owned public capabilities.

Examples include creating equipment and packages, configuring rental offers with pricing, and listing equipment types with inventory, catalog, pricing, category, and branch facts.

## Boundaries

- Tenant Management owns tenants, users, permissions, branches, product mode, and category taxonomy.
- Asset Inventory owns equipment types, physical assets, ownership metadata, and equipment-type accessory defaults.
- Catalog owns rentable items, fulfillment requirements, categories associated with catalog records, and rental offers.
- Pricing owns rate plans, tiers, promotions, coupons, and rental-offer pricing assignments.

Offering Management must use those modules' published capabilities. It must not query or mutate provider-owned persistence directly, duplicate provider invariants, or become authoritative over provider domain validity.

Physical Asset branches and commercial Rental Offer branches remain independent. Neither is inferred from the other.

## Persistence

Offering Management is normally persistence-free. Provider records remain persisted by their owning modules. If workflow audit, idempotency, or history is introduced later, those records should describe orchestration attempts rather than duplicate provider data.

## HTTP Surfaces

HTTP routes are consumer-facing surfaces and do not define the backend architectural boundary. Existing routes may therefore retain paths such as:

- `/offering-setup/equipment`
- `/offering-setup/packages`
- `/offering-setup/rental-offers`
- `/backoffice/equipment-types`

## References

- `apps/backend/docs/architecture/overview.md`
- `apps/backend/src/modules/tenant-management/README.md`
- `apps/backend/src/modules/asset-inventory/README.md`
- `apps/backend/src/modules/catalog/README.md`
- `apps/backend/src/modules/pricing/README.md`
