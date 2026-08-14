# Agent Context

Monorepo for a B2B multi-tenant equipment rental platform with frontend and backend apps plus shared workspace packages.

Use `pnpm` workspaces.

Validation commands:

- For work confined to one app or package, run validation from that workspace only.
- Do not run root workspace commands such as `pnpm build` or `pnpm lint` by default.
- Run root workspace commands only when the change spans multiple workspaces, validating an affected shared package requires downstream consumers, or the user explicitly requests repository-wide validation.

App-local commands:

- Follow each app's local `AGENTS.md` for its validation commands.

Top-level structure:

- `apps/` contains runnable applications.
- `packages/` contains shared contracts, schemas, types, and other reusable workspace packages.

When working inside an app, follow that app's local `AGENTS.md` for package-specific guidance:

- `apps/backend/AGENTS.md`
- `apps/backoffice/AGENTS.md`
- `apps/storefront/AGENTS.md`

When working inside shared packages, follow `packages/AGENTS.md` and any package-local `AGENTS.md` files.

Use `docs/agent-rules/review.md` for repo-wide review expectations.

Use nearby package code and config as the source of truth for package-specific conventions and commands.
