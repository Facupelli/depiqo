# Non-browser verification

Use this guide for local Backend and Backoffice checks. Run checks from the affected app unless the change also affects a shared package or another app. Browser verification and deployment are separate workflows.

## Fresh checkout

Use Node.js 24 and the pnpm version pinned in the root `package.json` (currently 11.0.9). From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @repo/api-contracts --filter @repo/temporal run build
```

Both apps consume built outputs from `@repo/api-contracts` and `@repo/temporal`. Rebuild the affected package when its source changes or its `dist/` output is missing. `@repo/ui` exports source and does not need a separate build.

For Backend checks, generate the Prisma client from `apps/backend/`:

```sh
pnpm run prisma:generate
```

Regenerate after changes to the Prisma schema, generator configuration, or Prisma version, or when the client is missing. Generation does not require a running database. Do not reinstall, rebuild shared packages, or regenerate Prisma before every check.

Backend database tests additionally require a running Docker daemon accessible to Testcontainers and access to pull `postgres:18-alpine` on a cold machine. No developer database, seed, local `.env`, or running app is required for these checks.

## App-local commands

Run these from `apps/backend/` or `apps/backoffice/` as appropriate:

| Purpose | Command | Effect |
| --- | --- | --- |
| Type-check | `pnpm run typecheck` | No source edits. Backend checks the app build inputs, not specs, and uses a separate incremental cache. |
| Lint | `pnpm run lint` | Read-only. Uses Oxlint in Backend. Backoffice checks Biome lint rules and assists (including import organization), without checking formatting. |
| Check formatting | `pnpm run format:check` | Read-only. Uses Prettier in Backend and Biome in Backoffice. |
| Apply lint fixes | `pnpm run lint:fix` | May edit files. Backoffice also applies Biome assists without running the formatter. Review the diff. |
| Apply formatting | `pnpm run format:write` | May edit files. Review the diff. |
| Check packaging | `pnpm run build` | Writes build artifacts. Backoffice may regenerate its route tree; its build is not a TypeScript check. |

The existing Backoffice CI lint step checks lint rules only. The local `lint` script also checks assists.

Start with the relevant static checks and focused tests. Use `build` when packaging, framework configuration, or route generation is affected. From `apps/backend/`, `pnpm run start:prod` starts the built `dist/src/main.js`; it requires normal runtime configuration and is not a verification command.

## Tests

Pass an app-relative path or a unique filename to focus a run. With no filter, each script runs its full suite.

| Workspace and suite | Focused example | Full suite |
| --- | --- | --- |
| Backend unit | `pnpm run test src/core/temporal/local-date.spec.ts` | `pnpm run test` |
| Backend integration (Prisma and PostgreSQL) | `pnpm run test:integration pricing-authoring.integration-spec.ts` | `pnpm run test:integration` |
| Backend HTTP E2E (Nest and Supertest) | `pnpm run test:e2e authenticated-tenant.e2e-spec.ts` | `pnpm run test:e2e` |
| Backoffice | `pnpm run test src/auth/permissions.test.ts` | `pnpm run test` |

Use `pnpm run test:db:ci` from `apps/backend/` to run full integration and then full HTTP E2E, stopping if integration fails. It does not include unit tests and does not take a file filter.

Always use the Backend database scripts, even for one file. Each suite gets a disposable PostgreSQL container and a runner-provided `DATABASE_URL`, and applies committed migrations before Vitest starts. Direct Vitest calls bypass that setup. Neither the developer database nor `bin/db` is part of this workflow. See [Backend Testing](../apps/backend/test/README.md) for test design and isolation rules.

## Recommended local timeouts

These are wall-clock budgets for a command runner, not Vitest settings or CI limits. They include setup and teardown for database tests. Allow extra time for cold installs, image pulls, and slower hosts. Treat a timeout or interrupted run as incomplete, even if some tests reported passes.

| Command | Suggested timeout | Local timing basis |
| --- | --- | --- |
| Install dependencies | 5 minutes with a warm package cache | A fresh checkout installed in about 1 minute with cached packages. |
| Build shared prerequisites or an app | 3 minutes each | The local app builds took about 20 to 57 seconds. |
| Lint, unit or Backoffice tests, Prisma generation | 60 seconds each | Local runs took about 4 to 31 seconds. |
| Format check or write | 2 minutes each | Backend format checks took 17 to 46 seconds and Backoffice took about 4 seconds. |
| Typecheck | 4 minutes | Cold app typechecks took about 32 to 135 seconds, including runs alongside other checks. |
| Focused Backend integration or HTTP E2E | 4 minutes | One-file runs took about 50 seconds to 2¼ minutes including database setup. |
| Full Backend integration | 15 minutes | About 5½ minutes inside Vitest in the initial investigation; about 11½ minutes including database setup and teardown when run alongside other checks. |
| Full Backend HTTP E2E | 15 minutes | About 9¼ minutes including database setup and teardown. |
| `test:db:ci` | 30 minutes | Both full suites and their separate database lifecycles took about 21 minutes. |
