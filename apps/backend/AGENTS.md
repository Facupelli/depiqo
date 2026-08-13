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
| Temporal field semantics, timezone ownership, and PostgreSQL mappings | `apps/backend/docs/architecture/temporal-semantics.md` |
| Architecture decisions | `apps/backend/docs/architecture/adr/` |
| Implementation rules by artifact type (repository vs direct Prisma, transactions) | `apps/backend/docs/implementation-rules/README.md` |
| Module-specific domain boundaries | `apps/backend/src/modules/*/README.md` |
| Cross-module collaboration and published boundaries | `apps/backend/docs/architecture/overview.md`, then the owning module's `public-api/` boundary |

## Implementation Rule Navigation

Start with:

```text
apps/backend/docs/implementation-rules/README.md
```

Then load only the artifact-specific rule docs needed for the change, such as command, query, controller, repository, mapper, DTO, domain error, entity, aggregate, value object, domain service, domain event, or testing rules.

## Cross-Module Work

Design cross-module work using the decision in `docs/architecture/overview.md`: use a synchronous published capability for an authoritative result needed now, an Integration Event for independently reactable completed facts, or a consumer-owned projection for repeated foreign facts where justified eventual consistency provides a concrete benefit. Do not require a new method on one module-wide `*.public-api.ts`; use the owning module's published/public boundary.

## Backend Skills

Use `backend-use-case-implementation` for backend command/query/controller/repository/use-case work.

## Module Docs

When working inside a module, read that module's README first:

```text
apps/backend/src/modules/<module>/README.md
```

