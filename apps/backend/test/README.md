# Backend Testing

This directory contains the backend integration and E2E test infrastructure.

## Database Fixtures

Use `createTestFixtures(prisma)` from `test/support/fixtures` to arrange low-level persisted prerequisites such as tenants, tenant users, rental customers, and branches. Factories are stateless, require explicit `tenantId` ownership for tenant-scoped records, and return login credentials for local-authentication actors. Use them for test arrangement rather than HTTP endpoints or production commands. They are not scenario builders.

## Deterministic Time Data

Use `test/support/time` for absolute timestamps used as test data:

```ts
import { dateInterval, oneMillisecondAfter, oneMillisecondBefore, utcDate } from '../support/time';

const startAt = utcDate(2026, 6, 15, 10);
const endAt = utcDate(2026, 6, 15, 12);
const existingPeriod = dateInterval(startAt, endAt);
const justBeforeEnd = oneMillisecondBefore(endAt);
const justAfterEnd = oneMillisecondAfter(endAt);
```

`utcDate()` takes one-based UTC calendar components and rejects invalid values rather than normalizing them. Use it instead of timezone-less date strings or local-time constructors when representing an absolute timestamp. Do not use `new Date('2026-06-15 10:00')`, `new Date(2026, 5, 15, 10)`, or values relative to the machine clock.

`dateInterval()` only groups `start` and `end` dates. It deliberately does not validate ordering or decide interval inclusivity, overlap, or rental eligibility. Those are domain-test concerns.

Do not use Jest fake timers or replace `Date` globally. Where an API accepts an explicit timestamp or calculation date, pass `utcDate(...)` directly. Controlled system-time support will be introduced only with the first concrete endpoint that requires it.

## Test Commands

Run commands from `apps/backend/`.

```bash
pnpm run test
pnpm run test:integration
pnpm run test:e2e
pnpm run test:db:ci
```

`test` runs tests that do not require the database test runner.

`test:integration` and `test:e2e` run through:

```text
test/support/run-db-tests.ts
```

`test:db:ci` runs the integration suite followed by the E2E suite.

## Database Test Environment

Database-backed tests use Testcontainers rather than the persistent development database or a Docker Compose test service.

For each Jest invocation, `run-db-tests.ts`:

1. Starts a fresh PostgreSQL 16 container.
2. Creates a uniquely named test database.
3. Applies all Prisma migrations with `prisma migrate deploy`.
4. Provides the generated connection URL through `DATABASE_URL`.
5. Runs the selected Jest configuration.
6. Stops the PostgreSQL container before reproducing Jest's exit code or termination signal.

The integration and E2E suites are separate runner invocations, so each receives its own container and database.

Do not configure these tests to use the local development database.

## Integration Tests

Integration tests are selected by:

```text
jest.config.integration.ts
```

They exercise real backend components against Prisma and PostgreSQL without requiring a complete HTTP application flow.

## Backend E2E Tests

E2E tests are selected by:

```text
jest.config.e2e.ts
```

They boot the complete Nest application and exercise it through HTTP, including middleware, Passport, sessions, controllers, and persistence.

Create the application once per spec suite with `beforeAll` and close it once with `afterAll`.

Do not recreate and destroy the complete application in `beforeEach` and `afterEach`. Repeated application startup and shutdown caused Jest to report delayed open handles in this project, even though the resources were eventually closed.

## Application Resource Cleanup

`configureApp()` creates resources that are not managed automatically by Nest, including the `connect-pg-simple` session store.

Use `createE2ETestApp()` to compile `AppModule`, configure and initialize the Nest Express application, and close both the application and resources created by `configureApp()`:

```ts
let testApp: E2ETestApp;

beforeAll(async () => {
  testApp = await createE2ETestApp();
});

afterAll(async () => {
  await testApp.close();
});
```

Make HTTP requests through `testApp.app.getHttpServer()`. The spec owns these hooks; the helper does not register Jest lifecycle hooks or share an application between spec files.

### E2E HTTP Sessions

Use `createE2ETestClient()` for an independent browser-like Supertest session. Each client retains only its own session cookie and CSRF token:

```ts
const client = createE2ETestClient(testApp.app);

await client.getCsrfToken();
await client.loginTenantUser({ email, password });

const response = await client
  .withCsrf(client.request().post('/some-route'))
  .set('Host', 'tenant-a.localhost')
  .expect(200);
```

`request()` exposes the session-retaining Supertest agent without a CSRF header. Apply the current session's token to an individual unsafe request with `withCsrf(...)`; use `request()` directly to test missing or invalid tokens. A successful tenant-user or tenant-customer login rotates and stores that client's CSRF token.

Authenticated tenant-user context comes from the session actor. Storefront tenant context is separate and is supplied through the signed storefront-context mechanism. Tests retain full control of arbitrary request headers, including `Host`, on each request where they are relevant.

Do not use Jest's `--forceExit` to hide shutdown problems.

## Test Isolation

For each integration or E2E Jest invocation, the runner starts one disposable PostgreSQL container, creates one uniquely named database, and applies Prisma migrations once before Jest starts. That same migrated container and database are reused for the whole invocation.

Before every individual integration and E2E test, Jest runs the database setup hook. The hook truncates all application tables in the `public` schema, restarts identity sequences, and cascades dependent rows. It preserves `_prisma_migrations`, so migrations are not rerun between tests.

This is database-reset isolation, not transaction-per-test isolation. Tests use real database connections and committed transactions, including E2E flows. Tests must not depend on execution order or on data created by another test.

The database suites run with one Jest worker because all tests in an invocation share the same database reset hook. Reconsider the isolation design before enabling parallel database test workers.

## Existing Time-Model Gaps

The application commonly handles timestamps as UTC `Date` instants and serializes them as ISO strings, but most PostgreSQL timestamp columns are `TIMESTAMP(3)` without timezone. The intended persistence contract needs an architecture review before it is changed.

Branches and tenant configuration have IANA timezones, while branch schedules store a calendar `DATE` and minutes-from-midnight. The current schedule-slot path constructs its date at UTC midnight and does not apply the branch timezone. The intended local-date and DST behavior needs product and architecture review.
