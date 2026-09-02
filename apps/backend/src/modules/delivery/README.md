# Delivery Module

Delivery is the bounded context that owns current delivery configuration and authoritative current Delivery quote calculation through its public boundary.

## Dependency Direction

```text
Rental Commitment -> Delivery -> Tenant Management
Rental Commitment -> Pricing
```

Delivery remains independent from Rental Commitment and Pricing. Delivery may retain tenant and branch identifiers. Tenant Management remains authoritative for Branch identity, lifecycle, timezone, and operational location. Delivery owns Delivery enablement and all Delivery configuration. Delivery does not access Tenant Management persistence or model Tenant Management records as Delivery domain objects.

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

Delivery owns and provides current branch Delivery configuration, customer location and road-distance resolution, current Delivery serviceability, Delivery and Collection pricing, special-hours classification, `transportReservationMinutes`, and authoritative current Delivery quotes through `DeliveryQuoteService`.

Rental Commitment consumes the current quote and owns prospective rental orchestration, accepted Delivery snapshots at confirmation, the accepted customer total, and confirmed or historical transport timing.

## Historical Boundary

Delivery owns current quote calculation only. Once a quote is accepted at rental confirmation, Rental Commitment persists provider-neutral accepted Delivery facts. Historical reads and post-confirmation operations use those accepted facts; Delivery is not queried again to reconstruct historical truth.
