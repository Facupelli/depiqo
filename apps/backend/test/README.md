# Backend Testing

This document defines the intended backend testing architecture. Run all commands from
`apps/backend/`.

## Test types

### Unit

Unit tests exercise domain and application behavior in isolation.

- Do not connect to a real database.
- Use fakes or mocks for persistence and other boundaries where appropriate.
- Keep the subject and composition as small as practical.

### Integration

Integration tests exercise real backend behavior through Prisma and PostgreSQL.
They cover use cases, repositories, Unit of Work behavior, transactions, database
constraints, and concurrency.

Use the smallest sensible Nest or application composition. A CommandBus, service,
use case, or repository is a valid entry point. Do not boot the full HTTP application
by default, and do not include Express, Passport, sessions, CORS, or other HTTP
infrastructure unless the behavior under test requires it.

### E2E

E2E tests boot the full `AppModule`, apply the production `configureApp()` lifecycle,
and send real HTTP requests through Supertest. They cover controllers, middleware,
authentication, sessions, pipes, filters, interceptors, serialization, application
behavior, and PostgreSQL persistence.

Outbound network providers remain replaced by deterministic fakes. Internal modules,
application services, event handlers, policies, repositories, and PostgreSQL remain real.

## Choosing the test type

Choose Integration when the important path is:

```text
use case / CommandBus / service
  -> real persistence
  -> PostgreSQL
```

Choose E2E when the important path is:

```text
HTTP
  -> middleware/auth/session/controller
  -> application
  -> PostgreSQL
  -> HTTP response
```

## Database lifecycle

Both Integration and E2E commands use this outer lifecycle:

```text
outer test runner
  -> start one disposable PostgreSQL Testcontainer
  -> run prisma migrate deploy once
  -> run Jest serially
  -> stop the container in finally
```

Jest does not own the Testcontainer lifecycle. The container must use the same
PostgreSQL major version as production. Database-backed tests must never target a
persistent development database.

## Isolation

The default isolation model is:

```text
one disposable database per test command
+
unique scenario data per test
```

A physically empty database before every `it()` is not required. Each test creates
its own tenant or root data graph and uses generated unique IDs, emails, slugs,
rentals, assets, and other identifying values.

Tests must not depend on execution order or globally empty tables unless global
emptiness is the behavior under test. Do not use full-schema `TRUNCATE` before every
test as the default, clone one database per `it()`, or wrap all tests in an outer
rollback transaction.

## Fixtures

Scenario data belongs in fixtures or builders invoked by the test. Avoid large global
seeds. Keep expensive setup opt-in. For example, hash a rental-customer password only
when authentication is part of the scenario.

Use deterministic, explicit test values. For absolute timestamps, use the helpers in
`test/support/time` and follow `docs/architecture/temporal-semantics.md`.

## Application lifecycle

For Integration specs, normally create the application context once per spec, create
fixtures per test, and close the context once after the spec.

For E2E specs, normally create the full Nest application once per spec with
`createE2ETestApp()`, create fixtures per test, and close the application and its
resources once after the spec.

Do not recreate `AppModule` per `it()` merely to obtain database isolation.

## Transactions and concurrency

Production transaction behavior must remain real. Rental Commitment tests may run
concurrent commands against the same PostgreSQL database to exercise actual constraints
and transaction races. Do not alter production transaction architecture to simplify tests.

Async event handlers must complete according to their production contract before teardown.

## Resource ownership

Every long-lived resource has one explicit owner:

- Prisma and Nest providers: Nest lifecycle
- `configureApp()` middleware resources, including session storage: application resource cleanup
- Direct `pg` clients or pools: the helper or test that created them
- PostgreSQL Testcontainer: outer test runner

Close resources through their owner. Do not rely on Jest `--forceExit`.

## Execution model

Keep database-backed suites serial for now. If parallel execution becomes necessary,
prefer an isolated database per Jest worker, not per test case.

## Commands

```bash
pnpm run test              # unit tests
pnpm run test:integration  # integration tests
pnpm run test:e2e          # E2E tests
pnpm run test:db:ci        # integration, then E2E
```
