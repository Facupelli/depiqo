# Backend Testing

This directory contains the backend integration and E2E test infrastructure.

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

E2E tests must retain the resources returned by `configureApp()` and close both the Nest application and those resources:

```ts
let app: INestApplication;
let closeAppResources: () => Promise<void>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();

  const resources = configureApp(app as NestExpressApplication);
  closeAppResources = resources.close;

  await app.init();
});

afterAll(async () => {
  await app.close();
  await closeAppResources();
});
```

Do not use Jest's `--forceExit` to hide shutdown problems.

## Test Isolation

The application and database are shared by the tests within one Jest invocation.

Tests must not depend on execution order or on data created by another test. Use unique fixture values or explicitly clean mutable data when isolation is required.

The runner currently provides one database per suite invocation, not one database per test or Jest worker. Reconsider concurrency and database isolation before adding multiple spec files that mutate overlapping data.
