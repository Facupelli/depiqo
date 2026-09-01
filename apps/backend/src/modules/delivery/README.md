# Delivery Module

Delivery is the bounded context that owns current delivery configuration and authoritative current Delivery quote calculation through its public boundary.

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

Delivery validates and persists configuration facts and provides authoritative current quote calculation through `DeliveryQuoteService`. The quote capability resolves the customer location, obtains one authoritative road distance, evaluates serviceability, and calculates Delivery-owned transport pricing and scheduling facts.

Delivery does not yet implement availability, accepted Delivery snapshots, confirmation, quote persistence, caching, Rental Commitment integration, or Pricing composition.
