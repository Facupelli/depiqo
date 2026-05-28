# Agent Context

Backend for a B2B multi-tenant equipment rental SaaS built with NestJS, Prisma, PostgreSQL, and TypeScript.

Run commands from `apps/backend/` unless there is a clear reason to run from the workspace root.

Use `pnpm`.

Common backend commands:

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`

Workspace commands:

- `pnpm build`
- `pnpm lint`

Use `apps/backend/docs/constitution/` as the source of truth for project mission, technical direction, and architectural decisions.

Use `apps/backend/docs/agent-rules/` as the source of truth for implementation rules, invariants, and examples.

Start with `apps/backend/docs/agent-rules/architecture.md` only when you need implementation-rule navigation. Then load any additional artifact-specific rule documents from `docs/agent-rules/` as needed for the code you are changing.

Use existing backend skills for specialized workflows:

- `backend-use-case-implementation` for command/query/controller/repository use-case work
- `prisma-domain-change-safely` for changes that cross Prisma, mappers, and domain entities
- `module-boundary-review` for auditing cross-module interactions and public contracts
- `backend-testing-selection` for choosing the smallest effective verification command

Use `apps/backend/docs/system-explanations/` for subsystem behavior and architecture references when working in a specific area of the product.

Use `apps/backend/docs/system-explanations/rental-domain-model.md` as the overview for rental-domain concepts, then load the linked focused docs as needed.

`AGENTS.md` is only an entrypoint and routing guide. Do not duplicate detailed rules here if they already exist in the docs.
