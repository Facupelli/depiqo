# Backend MVP Completeness Audit

## Scope and method

This audit covers the NestJS backend modules registered in `apps/backend/src/app.module.ts`, with findings assigned to Tenant Management, Rental Catalog, Asset Inventory, Pricing, Rental Commitment, Contracts, Notifications, Offering Setup, or cross-cutting infrastructure.

Evidence was gathered from module controllers and public APIs, commands/queries/handlers, domain aggregates, repositories, v2 and legacy Prisma schemas, migrations, events/consumers, guards, DTO validation, and available automated tests. Module READMEs and `apps/backend/docs/architecture/overview.md` were used only for terminology, ownership, invariants, and intended boundaries. Searches included alternative feature names, indirect public APIs, persistence-only implementations, events, and legacy signing/order code before classifying a capability as missing.

The audit traced setup, discovery, request/draft creation, pricing, confirmation, modification, allocation/blocking, accessories, preparation, contracts/signing, handover, return, completion, cancellation, notifications, and historical retrieval. A finding has one primary owner; cross-module consequences are dependencies or side effects rather than duplicate findings.

## Current backend coverage

The backend has a substantial creation and confirmation slice:

- tenant registration, sessions, tenant context, branch/config/branding/domain/signer management, and customer onboarding;
- rentable-item/package/offer setup plus storefront and backoffice catalog reads;
- equipment type, asset, owner/contract, and accessory-default creation plus inventory reads;
- rate-plan, assignment, promotion, and structured price calculation capabilities;
- draft/customer-confirmed rental creation, confirmation, automatic asset allocation/blocking, accepted price and owner-split snapshots, cancellation, accessory assignment, availability, and operational rental reads;
- remito generation, signing invitations, hashed public tokens, signature acceptance, signed document streaming, and signing summaries;
- email delivery for customer-created, confirmed, cancelled, and signing-invitation scenarios.

Coverage is strongly asymmetric. Most configurable resources can be created but not corrected or retired. The rental flow reaches confirmation but not a reliable pending request, confirmed modification, preparation, handover, return, or completion. Asset assignment cannot be corrected after confirmation. Contract regeneration/re-signing and durable notification delivery are absent. Authorization is tenant-membership based rather than operation-permission based, and critical concurrency/test coverage is incomplete.

## Most important end-to-end workflow gaps

1. **Customer request is a dead end:** `create-pending-rental` validates and returns an empty ID without persistence, pricing, snapshots, or events.
2. **Confirmed reservation is unsafe under concurrency:** allocation planning and block insertion are separated and no database exclusion constraint prevents overlapping active blocks.
3. **Rentals cannot be maintained:** dates, branch, selections, quantities, assignments, delivery facts, and confirmed price cannot be changed through coordinated lifecycle rules.
4. **Fulfillment stops after confirmation:** there is no preparation transition, pickup/delivery evidence, partial/full return, damaged-return handling, or completion capability.
5. **Configuration is mostly create-only:** catalog items/offers, equipment/assets, rate plans/assignments, users, customers, and owner contracts have missing lifecycle operations.
6. **Contracts can become stale:** no confirmed-rental edit integration marks `RESIGN_REQUIRED`, versions artifacts, or replaces signed documents safely.
7. **Notifications are best-effort and opaque:** attempts/provider responses are not persisted and failed post-commit events or deliveries cannot be durably retried.
8. **Sensitive operations lack granular authorization:** authenticated tenant users generally have equivalent endpoint authority.

## P0 findings grouped by workflow

### Tenant and staff administration

- Manage tenant users, roles, and permissions (`tenant-management.todo.md`).
- Enforce operation-level authorization consistently (`cross-cutting.todo.md`).

### Offering and inventory maintenance

- Correct rentable items and fulfillment requirements (`rental-catalog.todo.md`).
- Manage rental-offer visibility, rentability, and lifecycle (`rental-catalog.todo.md`).
- Correct and deactivate/reactivate equipment types (`asset-inventory.todo.md`).
- Maintain asset status, branch, ownership, and metadata (`asset-inventory.todo.md`).
- Correct, deactivate, and version rate plans (`pricing.todo.md`).
- Deactivate, replace, and detach offer pricing assignments (`pricing.todo.md`).
- Make multi-module setup atomic or recoverable (`offering-setup.todo.md`).

### Request, pricing, and confirmation

- Persist customer-created pending rental requests (`rental-commitment.todo.md`).
- Edit unconfirmed rental dates, branch, fulfillment, selections, and quantities (`rental-commitment.todo.md`).
- Redeem and void coupons with rental confirmation/cancellation (`pricing.todo.md`).
- Prevent concurrent double booking at the database boundary (`rental-commitment.todo.md`).
- Emit confirmation events for draft/pending confirmation (`rental-commitment.todo.md`).
- Establish idempotency for externally retried commands (`cross-cutting.todo.md`).
- Close transaction and optimistic-concurrency gaps (`cross-cutting.todo.md`).

### Confirmed modification and fulfillment

- Modify confirmed rentals with coordinated revalidation (`rental-commitment.todo.md`).
- Replace or unassign equipment assets safely (`rental-commitment.todo.md`).
- Represent preparation and readiness (`rental-commitment.todo.md`).
- Correct accessory lifecycle and state policy (`rental-commitment.todo.md`).
- Add pickup/delivery, return, partial return, condition, and completion transitions (`rental-commitment.todo.md`).

### Contracts and legal artifacts

- Persist generated unsigned artifacts in the Contracts model (`contracts.todo.md`).
- Regenerate contracts and mark re-signing required after relevant rental edits (`contracts.todo.md`).

### Notifications and operational reliability

- Persist delivery attempts and provider responses (`notifications.todo.md`).
- Retry failed deliveries idempotently (`notifications.todo.md`).
- Make event consumption durable and deduplicated (`notifications.todo.md`).
- Add end-to-end coverage for the complete rental lifecycle (`cross-cutting.todo.md`).

## Dependencies between findings

```text
Tenant user/role management
└─ operation-level authorization

Catalog + inventory + pricing lifecycle commands
├─ recoverable offering setup
├─ offering readiness diagnostics
└─ safe unconfirmed rental editing

Pending rental persistence + idempotency
└─ customer-created notification intent

Database block invariant + transactional concurrency
├─ safe confirmation
├─ assignment replacement
└─ accessory assignment

Unconfirmed edit policy
└─ confirmed edit policy
   ├─ block/assignment recalculation
   ├─ owner-split and coupon consequences
   ├─ contract RESIGN_REQUIRED/versioning
   └─ edit notifications

Assignment/accessory correction
└─ preparation/readiness
   └─ handover
      └─ partial/full return and completion

Immutable contract artifacts
└─ request replacement, voiding, regeneration, and re-signing

Durable event/outbox support
└─ persisted notification attempts
   └─ idempotent retry and lifecycle notification coverage
```

## Recommended implementation order

1. **Safety foundation:** operation permissions, v2 idempotency conventions, optimistic concurrency, active-block database invariant, and durable outbox/consumer identity.
2. **Make setup maintainable:** user administration; catalog offer/item lifecycle; equipment/asset lifecycle and projection updates; rate-plan/assignment lifecycle; recoverable Offering Setup.
3. **Complete request-to-confirmation:** persist pending requests, add unconfirmed edits, atomically redeem coupons, fix confirmation event emission, and add request/confirmation E2E coverage.
4. **Complete confirmed operations:** coordinated confirmed edits, manual replacement/unassignment, corrected accessory policy, and preparation/readiness.
5. **Complete physical lifecycle:** pickup/delivery, per-asset partial/damaged returns, release policy, and completion.
6. **Harden legal workflow:** unify immutable v2 artifacts, react to relevant rental edits, regenerate/re-sign, replace failed/expired requests, and void/revoke.
7. **Operationalize communications:** persist intents/attempts/provider responses, retry durably, and add the critical lifecycle event matrix.
8. **Finish P1/P2 administration and migration cleanup:** customer/branch/schedule/owner maintenance, customer history, category curation, boundary cleanup, and explicit legacy-to-v2 strategy.

## Finding counts

### By module

| Module | Findings | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: |
| Tenant Management | 5 | 1 | 4 | 0 |
| Rental Catalog | 5 | 2 | 2 | 1 |
| Asset Inventory | 6 | 2 | 4 | 0 |
| Pricing | 5 | 3 | 2 | 0 |
| Rental Commitment | 10 | 9 | 1 | 0 |
| Contracts | 5 | 2 | 3 | 0 |
| Notifications | 4 | 3 | 1 | 0 |
| Offering Setup | 3 | 1 | 2 | 0 |
| Cross-cutting | 6 | 4 | 2 | 0 |
| **Total** | **49** | **27** | **21** | **1** |

### By classification

| Classification | Count |
| --- | ---: |
| Missing | 23 |
| Partial | 19 |
| Inconsistent | 6 |
| Unverified | 1 |
| **Total** | **49** |

### By priority

| Priority | Count |
| --- | ---: |
| P0 | 27 |
| P1 | 21 |
| P2 | 1 |
| **Total** | **49** |

## Documentation conflicts

- Documentation states pending rentals do not block assets, but `assign-rental-accessories.handler.ts` allows PENDING and creates accessory blocks while excluding PREPARED.
- Documentation describes pending rental creation, but `create-pending-rental.service.ts` returns an empty ID without persistence.
- Documentation expects confirmation events and downstream notifications, but `Rental.confirm()` does not record `RentalConfirmedEvent`; only direct confirmed creation does.
- Documentation assigns all rental availability/block decisions to Rental Commitment, but Asset Inventory's accessory-default handler reads rental demand and block tables directly.
- Public-API boundary rules conflict with direct foreign Prisma reads explicitly noted in Catalog, Pricing, Asset Inventory, Rental Commitment read composition, and Contracts remito loading.
- Contracts documentation describes immutable v2 artifacts and signing-request-to-artifact traceability, while runtime signing still has overlapping legacy `DocumentSigningRequest` storage and contract writing does not visibly persist a v2 artifact.
- Tenant Management documentation owns permissions, but v2 users currently expose a coarse role and protected business endpoints show no operation-level permission enforcement.
- The architecture lists PICKED_UP/DELIVERED/RETURNED lifecycle meanings, while the persisted `V2RentalStatus` enum omits those states and has no equivalent per-fulfillment records.

## Areas that could not be verified

- The production deployment path that combines top-level legacy Prisma schema files with `prisma/schema/models/v2/`, and whether all migrations shown are deployed in order.
- Complete generated Prisma schema/client contents and database constraints beyond source schema and migrations, without provisioning a fresh audit database.
- Provider behavior for Resend, Cloudflare, and object storage under production credentials, retries, webhook delivery, or outage conditions.
- Frontend/backoffice use of every endpoint. This audit establishes backend capability completeness, not UI reachability.
- Runtime authorization outside the searched guards/controllers, because no centralized permission enforcement was found.
- Data backfill correctness for existing legacy orders, signing requests, and v2 records.
- Performance and query-plan behavior at production volumes.
- Full behavioral correctness of existing capabilities because automated coverage is very small and this task did not implement or execute missing lifecycle scenarios.
