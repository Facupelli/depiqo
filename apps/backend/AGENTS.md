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
| Architecture overview / module boundary rules | `apps/backend/docs/architecture/overview.md` |
| Architecture decisions | `apps/backend/docs/architecture/adr/` |
| Implementation rules by artifact type | `apps/backend/docs/agent-rules/architecture.md` |
| Module-specific domain boundaries | `apps/backend/src/modules/*/README.md` |
| Public cross-module contracts | `apps/backend/src/modules/**/*.public-api.ts` |

## Implementation Rule Navigation

Start with:

```text
apps/backend/docs/agent-rules/architecture.md
```

Then load only the artifact-specific rule docs needed for the change, such as command, query, controller, repository, mapper, DTO, domain error, entity, aggregate, value object, domain service, domain event, or testing rules.

## Backend Skills

Use existing backend skills for specialized workflows when available:

- `backend-use-case-implementation` for backend command/query/controller/repository/use-case work
- `prisma-domain-change-safely` for changes that cross Prisma, mappers, and domain entities
- `module-boundary-review` for auditing cross-module interactions and public contracts
- `backend-testing-selection` for choosing the smallest effective verification command

## Module Docs

When working inside a module, read that module's README first:

```text
apps/backend/src/modules/<module>/README.md
```

