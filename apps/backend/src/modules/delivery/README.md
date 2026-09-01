# Delivery Module

Delivery is the bounded context that owns current delivery configuration and, in later stages, delivery-specific operational decisions.

## Dependency Direction

```text
Rental Commitment -> Delivery -> Tenant Management
```

Delivery may retain tenant and branch identifiers. Tenant Management remains authoritative for Branch identity, lifecycle, timezone, and operational location. Delivery owns Delivery enablement and all Delivery configuration. Delivery does not access Tenant Management persistence or model Tenant Management records as Delivery domain objects.

## Domain Concepts

### Branch Delivery Configuration

`BranchDeliveryConfiguration` is the complete Delivery-owned configuration for one tenant branch. It owns:

- whether delivery is enabled
- currency and maximum service distance
- ordered distance price bands
- eligible weekdays and local minute-of-day windows
- the fixed special-hours surcharge
- transport reservation duration

A disabled configuration remains complete and preserves all configured values. Distance bands are canonically ordered by their maximum distance; no separate position is stored.

## Persistence

Delivery owns:

```text
v2_branch_delivery_configurations
v2_branch_delivery_distance_price_bands
```

The configuration owns its distance bands. The database has a tenant-safe physical foreign key from `(branch_id, tenant_id)` to Tenant Management's branch table, but the Prisma model intentionally has no relation to `V2Branch` or `V2Tenant`.

## Current Scope

This foundation validates and persists configuration facts only. Delivery does not yet implement location resolution, routing, quote calculation, eligibility evaluation, pricing selection, availability, rental confirmation, or Rental Commitment integration.
