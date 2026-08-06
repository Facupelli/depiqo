# Cross-Cutting MVP TODO

## Existing capabilities

The backend has tenant-aware Prisma safeguards, trusted storefront/internal tenant guards, session guards, DTO validation patterns, typed application errors in newer features, unit-of-work event publication, PostgreSQL migrations, and a small authenticated-tenant E2E suite.

## Missing or incomplete capabilities

### [ ] Enforce operation-level authorization consistently

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Ordinary staff cannot alter pricing, inventory, users, rentals, or contracts beyond their role.
- **Current evidence:** Backoffice controllers commonly use `SessionAuthGuard` and `TenantUserSessionGuard`; no permission decorator/guard usage was found in module controllers, despite Tenant Management documentation assigning permissions and older Prisma role/permission models.
- **Gap:** Authentication and tenant membership are treated as sufficient authority for sensitive commands.
- **Expected behavior:** Define an MVP permission matrix and enforce it at each command/query boundary using trusted actor context.
- **Lifecycle rules:** Owner-only membership/security actions remain distinct from operational staff actions.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** Tenant Management user/role capability.
- **Side effects:** Authorization-denial audit events for sensitive operations.
- **Acceptance criteria:** Every non-public endpoint declares and enforces intended authority, with no tenant ID accepted as proof of access.
- **Suggested tests:** Route permission matrix E2E tests for owner, restricted staff, customer, and cross-tenant actors.

### [ ] Add end-to-end coverage for the complete rental lifecycle

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Releases cannot regress setup, booking, allocation, contracts, fulfillment, and cancellation.
- **Current evidence:** Only `test/e2e/authenticated-tenant.e2e-spec.ts` and two narrow asset controller specs were found; core module handlers and lifecycle flows have no visible automated coverage.
- **Gap:** Critical tenant isolation, snapshots, block atomicity, lifecycle rules, and downstream events are unverified.
- **Expected behavior:** Add focused database integration and true HTTP E2E journeys for each P0 workflow rather than generic test-count work.
- **Lifecycle rules:** Tests use real PostgreSQL for constraints/concurrency and realistic session actors.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** P0 capabilities in all modules.
- **Side effects:** None.
- **Acceptance criteria:** CI exercises setup through return/completion plus cancellation, modification, signing, notification failure, and cross-tenant denial.
- **Suggested tests:** The acceptance criterion itself defines the required E2E suites; add concurrent block/coupon integration suites.

### [ ] Establish idempotency for externally retried commands

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Browser, webhook, or worker retries do not create duplicate rentals, setup records, confirmations, contracts, or messages.
- **Current evidence:** Legacy order idempotency tables/migrations and notification provider keys exist, but v2 rental/setup/confirmation commands expose no general idempotency record; signing has a request lock.
- **Gap:** Retry safety is inconsistent across sensitive v2 command boundaries.
- **Expected behavior:** Require stable request keys for customer rental submission and other externally retried creates; make transitions naturally idempotent with stored outcomes.
- **Lifecycle rules:** Same key/same payload returns the original result; same key/different payload conflicts.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** Each owning module defines command semantics and result storage.
- **Side effects:** Scoped idempotency records with expiry/audit metadata.
- **Acceptance criteria:** Concurrent duplicate requests produce one business aggregate and deterministic responses.
- **Suggested tests:** Parallel HTTP retry tests for rental creation, offering setup, confirmation, signing invitation, and notification consumption.

### [ ] Close transaction and optimistic-concurrency gaps

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Two operators editing or transitioning the same resource cannot silently overwrite each other.
- **Current evidence:** Transactions exist in several repositories, but models lack explicit versions; `PrismaRentalRepository.save` deletes/recreates children and uses upsert without expected-version checks; allocation planning precedes the confirmation transaction.
- **Gap:** Lost updates and stale decisions are possible even apart from the known asset-block race.
- **Expected behavior:** Add expected-version/conditional transition checks for lifecycle aggregates and keep validation plus mutation in the appropriate transaction/lock boundary.
- **Lifecycle rules:** Stale commands fail with a conflict and may be retried after reload.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** Aggregate-specific policies in each bounded context.
- **Side effects:** Version fields or conditional updated-at/status writes and stable conflict mapping.
- **Acceptance criteria:** Concurrent edits/transitions cannot both overwrite state and partial child rewrites roll back.
- **Suggested tests:** Real-database stale-write tests for rentals, pricing assignments, catalog activation, and contract transitions.

### [ ] Eliminate direct cross-bounded-context persistence access

- **Priority:** P1
- **Status:** Inconsistent
- **MVP scenario:** Each module enforces its own tenant, lifecycle, and snapshot rules consistently.
- **Current evidence:** Explicit TODOs identify direct foreign Prisma reads in Catalog detail/list/activation, Pricing draft calculation, Asset Inventory accessory defaults, Rental Commitment list composition, and Contracts remito loading.
- **Gap:** Current implementation conflicts with `docs/architecture/overview.md` public-API boundary rules and can bypass owner validation.
- **Expected behavior:** Commands use owner public APIs; intentional composite read models use documented read contracts/projections and never mutate foreign tables.
- **Lifecycle rules:** Historical snapshots are read from their owner, not reconstructed from live foreign data.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** Public read/validation APIs in all bounded contexts.
- **Side effects:** Projection synchronization only where justified.
- **Acceptance criteria:** Static dependency checks and code review find no private repository/entity/Prisma write-model access across modules.
- **Suggested tests:** Architecture import tests and public-contract integration tests.

### [ ] Reconcile legacy and v2 schemas/modules

- **Priority:** P1
- **Status:** Unverified
- **MVP scenario:** Production migrations, generated Prisma client, and runtime modules operate on one coherent source of truth.
- **Current evidence:** Top-level Prisma schema files contain legacy `Order`, `ProductType`, `Asset`, and `DocumentSigningRequest` models, while `prisma/schema/models/v2/` and runtime modules use v2 models; both `ContractsModule` and `DocumentSigningModule` participate in signing.
- **Gap:** The repository does not prove migration/ownership completion, data coexistence policy, or which legacy capabilities remain production-critical.
- **Expected behavior:** Document active model ownership and migration path, prevent new v2 workflows from depending accidentally on legacy tables, and verify generated schema includes required v2 constraints.
- **Lifecycle rules:** Historical legacy records remain readable/migratable without mixing authority in new commitments.
- **Owning module:** Shared infrastructure / cross-cutting
- **Dependencies:** All owning modules and deployment migration process.
- **Side effects:** Migration/backfill or explicit read-only compatibility adapters.
- **Acceptance criteria:** A clean database migrates and runs all v2 workflows; legacy data strategy is tested and no duplicate authority remains undocumented.
- **Suggested tests:** Clean migration test, representative legacy-data upgrade test, and generated-client/schema drift check.
