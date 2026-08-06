# Agent Context

Backend for a B2B multi-tenant equipment rental SaaS built with NestJS, Prisma, PostgreSQL, and TypeScript.

Run commands from `apps/backend/` unless there is a clear reason to run from the workspace root.

Use `pnpm`.

## Commands

Backend-local:

- `pnpm run build`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run test:integration`
- `pnpm run test:e2e`

## Documentation Map

Use these docs as the routing table.

| Need | Read |
| --- | --- |
| Product mission / technical direction | `apps/backend/docs/constitution/` |
| Architecture overview / module boundary rules (cross-module read/write prohibitions) | `apps/backend/docs/architecture/overview.md` |
| Architecture decisions | `apps/backend/docs/architecture/adr/` |
| Implementation rules by artifact type (repository vs direct Prisma, transactions) | `apps/backend/docs/implementation-rules/README.md` |
| Module-specific domain boundaries | `apps/backend/src/modules/*/README.md` |
| Public cross-module contracts | `apps/backend/src/modules/**/*.public-api.ts` |

## Implementation Rule Navigation

Start with:

```text
apps/backend/docs/implementation-rules/README.md
```

Then load only the artifact-specific rule docs needed for the change, such as command, query, controller, repository, mapper, DTO, domain error, entity, aggregate, value object, domain service, domain event, or testing rules.

## Backend Skills

Use `backend-use-case-implementation` for backend command/query/controller/repository/use-case work.

## Module Docs

When working inside a module, read that module's README first:

```text
apps/backend/src/modules/<module>/README.md
```

