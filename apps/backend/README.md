# Architecture Decision Record (ADR): Rental SaaS Platform

## Application Overview

**Product:** A B2B SaaS platform designed for equipment rental businesses.
**Goal:** To provide a customizable, multi-tenant solution that enables companies to manage inventory, handle complex booking lifecycles, track maintenance, and process billing.
**Target Audience:** Rental businesses ranging from construction machinery (heavy assets) to event gear (bulk stock).
**Key Differentiator:** Specialized support for both serialized asset tracking (maintenance history, depreciation) and bulk quantity management within a unified system.

## Temporal Semantics

For active V2 fields, use the canonical [temporal semantics](./docs/architecture/temporal-semantics.md) guide to select between absolute instants, local dates, local times, ranges, and timezone-derived values.

---

## 1. Repository Structure: Monorepo

**Decision:** Use a Monorepo (managed via Turborepo/pnpm) containing `apps/backend`, `apps/backoffice`, `apps/storefront`, and shared packages.
**Why:**

- **End-to-End Type Safety:** Allows sharing TypeScript interfaces (DTOs) between backend and frontend. Changes in the API contract trigger compile-time errors on the client, eliminating "drift" bugs.
- **Independent Deployment:** Decouples deployment targets; the frontend can be deployed to Vercel/Netlify while the backend goes to a container service, without splitting the codebase.
- **Code Reuse:** Centralizes business logic, UI components, and utility functions.

---

## 2. Architectural Pattern: Modular Monolith

**Decision:** Build a single deployable application organized into independent modules (NestJS Modules, Prisma, Passport JWT), rather than starting with microservices.
**Why:**

- **Speed:** Eliminates the operational complexity of distributed systems (network latency, deployment orchestration) during the early stage.
- **Boundaries:** Enforces strict separation of concerns (Rental vs. Billing vs. Inventory), making it easier to extract specific modules into microservices later if scaling demands it.
- **Transaction Management:** Allows for ACID transactions across modules within the same database, which is critical for booking integrity.

---

## 3. Multi-Tenancy Strategy: Row-Level Security (Discriminator Column)

**Decision:** Use a shared database with a `tenant_id` column on every table to isolate data.
**Why:**

- **Cost Efficiency:** Minimizes infrastructure costs (one DB instance) and simplifies backup/restore procedures.
- **Maintenance:** Eliminates the need to run migrations across hundreds of separate databases.
- **Flexibility:** The data access layer can be abstracted, allowing us to migrate high-value "enterprise" clients to isolated schemas or databases later without rewriting application logic.

---

## 4. Inventory Data Model: Hybrid (Asset & Stock)

**Decision:** Support both serialized assets (tracked by ID/Serial Number) and bulk stock (tracked by quantity) within the same structure.
**Why:**

- **Domain Reality:** Equipment rental requires tracking specific unit history (maintenance, damage) for things like excavators, while commodity rental (e.g., chairs, tents) requires simple quantity management.
- **Unified Logic:** A single `Inventory` table with a `tracking_type` flag prevents code duplication for the booking process.
- **Taxonomy:** Products support a flat, per-tenant category system (e.g., "Camera", "Lens", "Lighting"). Categories are optional on a product and orthogonal to `trackingType` — a category may contain both serialized and bulk items.

---

## 5. Data Extensibility: JSONB Attributes

**Decision:** Use PostgreSQL JSONB columns for custom equipment attributes (e.g., size, power source, weight) rather than creating separate tables per category.
**Why:**

- **SaaS Flexibility:** Allows tenants to define custom fields for their specific inventory types (Skis vs. Jackhammers) without requiring schema migrations or complex Entity-Attribute-Value (EAV) SQL joins.
- **Type Safety:** TypeScript interfaces on the frontend can validate these flexible structures while the database remains agnostic.

---

## 6. Concurrency & Critical Path: Hybrid Constraint Strategy

**Decision:** Use Database Exclusion Constraints for physical assets, and Application-Level Logic for "virtual" (over-rented) bookings.
**Why:**

- **Data Integrity:** For physical stock (`inventory_item_id` set), the database enforces hard limits to prevent double bookings via a PostgreSQL EXCLUDE constraint on the `tstzrange` rental period.
- **Business Flexibility:** For "over-rentals" (`inventory_item_id` is null, only `product_id` set), the constraint is bypassed to allow accepting orders beyond current capacity. The application enforces `max_over_rent_threshold` from `TenantPricingConfig` to prevent infinite over-renting.

---

## 7. Cross-Module Collaboration

**Decision:** Choose cross-module collaboration by the business semantics required by the use case.

- Use a provider-owned synchronous public capability when another module needs an authoritative answer or operation now to complete its use case.
- Use an Integration Event for a completed business fact that other modules, workers, or external integrations may react to independently.
- Use a consumer-owned local projection only when foreign-owned facts are needed repeatedly and eventual consistency provides a concrete benefit that justifies synchronization complexity.

A bounded context may publish multiple small, cohesive capabilities rather than one growing module-wide API. The provider owns each published contract and expresses it in its own vocabulary and semantics. Consumers translate those concepts into their own domain. Public contracts use stable published types and do not leak persistence records, Prisma-generated types, internal implementation types, or domain types or errors owned by another bounded context.

Domain Events remain module-internal facts. Integration Events are the public post-commit events that cross module boundaries. Events do not replace a synchronous capability when the initiating use case requires the result.

---

## 8. Background Jobs: BullMQ with Redis

**Decision:** Offload heavy or third-party operations (Sending Emails, PDF Generation, Syncing to Accounting Software) to a job queue.
**Why:**

- **Performance:** Keeps API response times fast by moving I/O-bound tasks to the background.
- **Resilience:** Provides automatic retries for failed jobs (e.g., third-party API downtime), ensuring tasks are not lost if a service temporarily fails.

---

## 9. Pricing Strategy: Unit-Aware, Calendar-Aware Engine

**Decision:** Implement a `PricingEngine` domain service that calculates costs through a four-stage pipeline. Pricing tiers are defined per `BillingUnit` (a first-class tenant-configured concept), not per calendar day.

### Pipeline Stages

```
Calendar Rules → Unit Decomposition → Tier Resolution → Amount Calculation
```

**Stage 1 — Calendar Rules:** Computes raw duration in hours from `startDate`/`endDate`. Applies tenant config rules (e.g., `weekendCountsAsOne`: Saturday + Sunday together = 1 billable day). Produces `billableHours` and a `calendarAdjustments[]` log.

**Stage 2 — Unit Decomposition:** Decomposes `billableHours` into tenant-defined `BillingUnit`s (e.g., `half_day = 12h`, `full_day = 24h`, `week = 168h`) using a greedy largest-first algorithm. For daily rentals, applies the tenant's daily billing behavior through `RoundingRule`.

**Stage 3 — Tier Resolution:** Normalizes all unit thresholds to hours for comparison. Applies flat tier logic: the highest `fromUnit` threshold the booking satisfies wins, and that rate applies to the entire booking. Item-level tiers take precedence over product-level tiers.

**Stage 4 — Amount Calculation:** Builds one `PriceBreakdownEntry` per billing unit type. Uses `decimal.js` via the `Money` value object for all arithmetic — no floating-point drift on financial calculations.

### Key Design Decisions

- **`BillingUnit` is a first-class tenant concept**, not an implicit "day." A week-rate is a genuine week unit — not 7 days pretending to be one.
- **`basePrice` does not exist on `Product`.** Instead, every product must have at least one `PricingTier` with `fromUnit: 1` (the base tier). This invariant is enforced by the `Product` aggregate on creation and prevents a product from existing without any pricing.
- **Flat tier model:** the whole booking is priced at the matched tier's rate. Progressive (tax-bracket) pricing is not implemented in v1.
- **The `PricingEngine` is a pure domain service:** no I/O, no side effects, deterministic. The application layer fetches all inputs (tiers, billing units, config) before calling the engine.
- **Bundles use the same engine:** the application layer fetches `BundlePricingTier[]` and passes them to the `PricingEngine` in the same shape as product tiers. The engine is unaware of the distinction. See §10.

### Output: `PriceBreakdown` Value Object

The engine returns an immutable `PriceBreakdown` VO that is persisted as JSONB on `BookingLineItem.priceBreakdown`. It contains the full audit trail: `entries[]`, `tierApplied`, `calendarAdjustments[]`, `rawDurationHours`, and `totalBillableHours`. Disputes are resolved from the snapshot — historic pricing logic is never re-run.

### Future: PromotionEngine (Not in v1)

A `PromotionEngine` will sit downstream of `PricingEngine` as a separate pipeline stage, receiving the `PriceBreakdown` as input and producing a `DiscountBreakdown`. Promotions are a distinct domain concern from pricing — different lifecycle, different actors, different stacking rules. They are explicitly out of scope for v1.

---

## 10. Product Bundles (Combos)

**Decision:** Implement bundles as a thin catalog entity (`ProductBundle`) that provides a discoverable, named offering in the UI, owns its own `BundlePricingTier[]`, and expands into individual `BookingLineItem`s at booking time via a parent/child pattern.

Bundles are **not** a new `TrackingType` on `Product`. They are **not** a promotion rule. They are a catalog-layer concept that triggers structured expansion at the booking layer.

### What a Bundle Is (and Is Not)

| Concern                                                            | Answer                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| Does a bundle have its own inventory?                              | No. It draws from component product pools.        |
| Can components be rented standalone alongside a bundle?            | Yes.                                              |
| Can a customer rent the same bundle multiple times in one booking? | Yes.                                              |
| Does a bundle have its own pricing tiers?                          | Yes — via a dedicated `BundlePricingTier` model.  |
| Is bundle pricing derived from component prices?                   | No — it is independently defined.                 |
| Can bundle tiers have item-level overrides?                        | No. `BundlePricingTier` has no `inventoryItemId`. |
| Does the bundle appear as one line in the Cart/Booking UI?         | Yes — via the parent line item.                   |

### Separate `BundlePricingTier` Model

Bundles use a dedicated pricing table rather than sharing `PricingTier` with products. This keeps `PricingTier` unambiguously product-scoped, preserves its existing unique constraints intact, and makes each table's ownership clear.

`BundlePricingTier` omits `inventoryItemId` entirely — bundles have no physical items of their own and therefore no item-level price overrides. Both tables share the same tenant-configured `BillingUnit`s.

The `PricingEngine` receives `BundlePricingTier[]` in the same data shape as `PricingTier[]`. No engine changes are required.

### Parent / Child Line Item Pattern

When a bundle is booked, the application creates one **parent** line item and N **child** line items — one per component product.

```
BookingLineItem                          ← Parent (bundle header)
  bundleId:         "camera-kit-id"
  productId:        null
  inventoryItemId:  null
  quantityRented:   1                    ← Number of bundle instances
  unitPrice:        100.00              ← From BundlePricingTier
  lineTotal:        100.00
  priceBreakdown:   { ... }             ← PricingEngine output for the bundle
  parentLineItemId: null

  ├── BookingLineItem                    ← Child (camera component)
  │     productId:        "camera-id"
  │     bundleId:         null
  │     inventoryItemId:  "item-SN-001"
  │     quantityRented:   1
  │     unitPrice:        0.00          ← Financial value is on parent
  │     lineTotal:        0.00
  │     parentLineItemId: "<parent-id>"
  │
  ├── BookingLineItem                    ← Child (lens component)
  │     productId:        "lens-id"
  │     inventoryItemId:  "item-SN-042"
  │     unitPrice:        0.00
  │     lineTotal:        0.00
  │     parentLineItemId: "<parent-id>"
  │
  └── BookingLineItem                    ← Child (stabilizer component)
        productId:        "stabilizer-id"
        inventoryItemId:  "item-SN-017"
        unitPrice:        0.00
        lineTotal:        0.00
        parentLineItemId: "<parent-id>"
```

**Financial accounting:**

- `Booking.subtotal` is derived from **parent line items only**. Children have `lineTotal: 0` and are excluded from financial aggregation.
- The `PriceBreakdown` snapshot lives on the parent.
- Children carry no financial value — they are purely inventory tracking records.

**Invariants:**

- A parent bundle line item always has `productId: null`, `inventoryItemId: null`, `lineTotal > 0`.
- A child component line item always has `bundleId: null`, `lineTotal: 0`, `parentLineItemId` set.
- A standalone product line item always has `bundleId: null`, `parentLineItemId: null`, `lineTotal > 0`.

### Availability Check: Bundles Are Transparent

`AvailabilityService` has **no knowledge of bundles**. The booking handler performs bundle expansion in memory before the availability check runs, so the service always receives a flat map of product demands — regardless of whether those demands originated from a standalone item or a bundle component.

The flow at booking creation time is:

1. Fetch bundle components via `RentalBundleQueryPort` (booking handler responsibility)
2. Expand into child line item objects **in memory** — not yet persisted
3. Merge children + standalone line items into a unified product demand map
4. Pass that flat map to `AvailabilityService` — which is unchanged
5. If all demands are satisfiable, persist parent + children atomically

This means the unified demand model (including the mixed-booking case where a lens appears in both a bundle and as a standalone item) is resolved entirely in the booking handler before the availability service is involved.

**Mixed booking example** — Camera Kit × 1 + Lens (standalone) × 1:

After in-memory expansion, the demand map passed to `AvailabilityService` is:

```
Camera:     1
Lens:       2  ← 1 from bundle component + 1 standalone
Stabilizer: 1
```

If only 1 lens exists, the booking is rejected cleanly by the availability check — not by a DB constraint violation.

### Booking Creation Atomicity

Bundle availability is treated as all-or-nothing at creation time. If any component cannot be fully satisfied, the entire bundle line is rejected. There is no partial bundle state at creation — the booking handler either creates all line items (parent + all children) or none of them.

### Pricing Pipeline

The application layer fetches `BundlePricingTier[]` for the bundle, then calls `PricingEngine` identically to the product path:

```
1. Identify line item is a bundle (bundleId set, no productId)
2. Fetch BundlePricingTier[] + tenant BillingUnit[] + TenantPricingConfig
3. Call PricingEngine(tiers, billingUnits, config, rentalPeriod)
4. Attach PriceBreakdown to parent line item
5. Create child line items with lineTotal: 0
```

### Soft Delete Constraint

`onDelete: Restrict` on `BookingLineItem.bundle` means a `ProductBundle` that has ever been booked cannot be hard-deleted. Retiring a bundle is done via `isActive: false`. The admin UI must treat bundle deletion as soft deletion.

### Module Ownership

| Entity                      | Module                           | Reason                                                   |
| --------------------------- | -------------------------------- | -------------------------------------------------------- |
| `ProductBundle`             | `InventoryModule`                | Catalog entity — peer of `Product`                       |
| `BundleComponent`           | `InventoryModule`                | Owned by `ProductBundle` aggregate                       |
| `BundlePricingTier`         | `InventoryModule`                | Same ownership as product tiers                          |
| Bundle availability check   | `RentalModule` (booking handler) | Expansion happens before `AvailabilityService` is called |
| Bundle expansion at booking | `RentalModule` (booking handler) | Booking orchestration responsibility                     |

**Cross-module port:**

```typescript
// rental/domain/ports/rental-bundle-query.port.ts
abstract class RentalBundleQueryPort {
  abstract findBundleWithComponents(bundleId: string, tenantId: string): Promise<BundleWithComponents | null>;
}
```

### Open Questions (Deferred)

- **Partial bundle cancellation:** If one component becomes unavailable after booking (e.g., camera goes to maintenance), does the bundle cancel entirely or does the tenant substitute? State machine behavior for bundle parent/child on cancellation is not defined in v1.
- **Bundle reporting:** Aggregating on parent line items filtered by `bundleId`. No special schema needed — deferred to reporting queries.
- **Bundle visibility per plan tier:** Whether bundles are a feature gated by `Tenant.planTier` is a `TenancyModule` concern — deferred to plan enforcement layer.
- **`isExternallySourced` on children:** Whether component items inside a bundle can be externally sourced, and how that affects `BillingModule` payout logic, is deferred to v2.

---

## 11. Published Capability Pattern

**Decision:** The owning bounded context defines and owns its published contracts. A published boundary may contain multiple small, cohesive synchronous capabilities and public Integration Events; it is not required to be one module-wide port or API.

**Why:**

- **Ownership clarity:** The authoritative context defines capabilities around its own business responsibilities rather than consumer-specific convenience.
- **Contract stability:** Provider-owned contracts use stable published types and protect persistence, internal services, engines, and foreign domain types from consumers.
- **Independent evolution:** Consumers translate provider concepts into their own domain, allowing both contexts to evolve without sharing internals.

**Design check:** If this bounded context were owned by another team, would this still be a natural capability to ask it for?

A consumer that needs an authoritative result now calls the provider's synchronous capability. A consumer that can react independently to a completed fact consumes an Integration Event. A consumer may maintain its own projection when repeated foreign facts justify eventual consistency and its synchronization complexity. The provider remains authoritative in all cases.

---

## 12. Tech Stack

- **Backend:** NestJS (Enforces modular architecture).
- **Database:** PostgreSQL (Relational integrity + JSONB flexibility + native `tstzrange` for temporal queries).
- **ORM:** Prisma (with raw SQL via `$queryRaw` for `tstzrange` operations not supported by Prisma's query builder).
- **Frontend:** TanStack Start (Type-safe full-stack framework).
- **Queue:** Redis + BullMQ.
- **Validation:** `nestjs-zod` for DTO schemas (Zod schema first, class generated via `createZodDto`).
- **Financial Arithmetic:** `decimal.js` via a `Money` value object — no native `number` for monetary calculations.
