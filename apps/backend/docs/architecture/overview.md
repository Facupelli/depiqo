# Architecture Overview

## Product Summary

Depiqo is a multi-tenant equipment rental SaaS.

The system helps rental businesses manage tenant setup, rentable catalog items, physical equipment assets, pricing, discounts, rental orders, asset assignment, asset blocking, accessory preparation, contract generation, signing, and notifications.

The backend is designed around a core rental reality: catalog definitions change, prices change, assets move, owners change, and tenant configuration changes, but confirmed rentals and signed documents must preserve the facts accepted at the time.

## Architectural Style

The backend is a modular monolith built with NestJS, Prisma, PostgreSQL, and TypeScript.

Modules are organized around bounded contexts where possible. Each bounded context owns its language, rules, persistence, and public application capabilities.

Some modules are orchestration or infrastructure modules. They coordinate work across bounded contexts without owning the records, rules, or invariants they coordinate.

## Module Boundary Rules

Modules must protect their own domain rules and persistence details.

Cross-module access must go through the owning module's public API contract or an explicit integration event/projection mechanism. Other modules must not import its repositories, Prisma delegates, entities, internal services, or implementation-specific providers.

A module must never query or mutate another module's owned Prisma models directly. This prohibition applies to commands, queries, application services, repositories, background jobs, and transaction callbacks. There is no direct-read exception for convenience, performance, existence checks, or joining related records.

When a module needs current data owned elsewhere, it must call the owner's public API. When it needs locally queryable data, it may own a deliberate projection or historical snapshot synchronized through public contracts or integration events. The consuming module may query that local model directly because it owns the model, not because cross-module database access is allowed.

Cross-module references do not transfer ownership. Foreign keys and IDs may point at records owned elsewhere, but the referenced module remains the authority over its current source records. Snapshots and projections are separate models owned by the module that deliberately maintains them.

Module READMEs should explain ownership, boundaries, domain concepts, invariants, and common mistakes. They should not duplicate public API surfaces or Prisma schema details.

## Persistence and Source-of-Truth Rules

The Prisma schema is the source of truth for physical model, table, column, status, and enum names.

Architecture documentation should explain which module owns each table, what domain meaning the table has, which invariants matter, and which cross-module references are intentional.

The Prisma schema and module READMEs must be used together to determine model ownership before adding a database call. If ownership remains unclear, stop and clarify it before implementation.

## Historical Snapshot Rule

Live/current records are mutable source records for future operations.

Any fact that must remain true for a confirmed rental must be copied into Rental Commitment or a downstream historical artifact. Examples include accepted price, selected offers, operational demand lines, assigned asset references, owner split data, generated contract artifacts, and signature acceptance records.

Confirmed rentals must not depend on current catalog, pricing, owner, tenant, or asset configuration to reconstruct historical business facts.

## Module Map

### Tenant Management

Owns tenant identity, tenant users, authentication/authorization, permissions, branches, schedules, product mode, branding, custom domains, tenant configuration, tenant contract signer configuration, and trusted tenant context resolution.

Provides tenant, branch, permission, and configuration context to other modules.

### Rental Catalog

Owns what a tenant offers for rent: rentable items, branch-specific rental offers, catalog visibility/rentability, categories, and fulfillment requirements.

A customer or staff member selects a `RentalOffer`. The selected offer expands into operational fulfillment requirements that Rental Commitment snapshots.

### Asset Inventory

Owns the physical truth about equipment: equipment types, physical assets, ownership, condition, location/branch reference, active state, third-party ownership metadata, assignment eligibility facts, and equipment-type accessory defaults.

Provides current asset facts and eligibility checks to Rental Commitment.

### Pricing

Owns current price calculation rules: rate plans, billing policies, tiers, promotions, coupons, pricing assignments, and price breakdown generation.

Provides proposed price breakdowns to Rental Commitment. Accepted historical prices belong to Rental Commitment as snapshots.

### Rental Commitment

Owns rental orders as commercial and operational commitments.

It owns rental lifecycle, selected offer snapshots, operational demand lines, assigned asset references, rental-created asset blocks, accepted price snapshots, accessory preparation decisions, delivery details, and owner split snapshots.

`AssetBlock` belongs to Rental Commitment because it prevents the same physical asset from being committed to overlapping rentals.

### Contracts

Owns contract document generation, signing requests, signature acceptance, signed document artifacts, public receipt/download tokens, and contract signing status.

Contracts derives legal documents from accepted rental facts and preserves the exact document artifact accepted by the signer.

### Notifications

Owns notification delivery. It reacts to completed business events from other modules and manages channels, delivery state, retries, and provider concerns.

Notifications does not own the business event that caused a notification.

### Offering Setup

Offering Setup is an orchestration module, not a bounded context.

It coordinates tenant-admin setup workflows that may call Tenant Management, Asset Inventory, Rental Catalog, and Pricing. Created records remain owned by their target modules.

## Cross-Cutting Runtime Flow

### Tenant Context Resolution

Tenant context is resolved through a trusted backend resolver owned by Tenant Management.

```text
TanStack Start request
  -> GET /internal/tenant-context/resolve?hostname=<hostname>
  -> Tenant Management resolves host/domain/slug
  -> backend returns trusted tenant context
  -> frontend maps it to public tenant context before rendering
```

The frontend may pass request facts such as host and pathname, but the backend decides the trusted tenant context.

## Events and Side Effects

Modules may emit events when module-owned facts change and another workflow needs to react.

Do not introduce events only because they are listed in documentation. Events should exist only when there is a real consumer or workflow need.

Provider-specific side effects should stay inside the owning module or infrastructure adapter.

## Documentation Index

Module details live near their implementations under `apps/backend/src/modules/*/README.md`.

Architecture decision records live in `docs/architecture/adr/`.

Repository-level agent instructions live in `AGENTS.md`.
