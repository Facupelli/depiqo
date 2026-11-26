# Agent Context

Monorepo for a B2B multi-tenant equipment rental platform with frontend and backend apps plus shared workspace packages.

Use `pnpm` workspaces.

Use the [non-browser verification guide](docs/verification.md) for Backend and Backoffice setup, commands, and timeouts. Run checks from the affected workspace by default. Use root commands for shared prerequisites, cross-workspace validation, or explicitly requested repository-wide checks.

Top-level structure:

- `apps/` contains runnable applications.
- `packages/` contains shared contracts, schemas, types, and other reusable workspace packages.

When working inside an app, follow that app's local `AGENTS.md` for package-specific guidance:

- `apps/backend/AGENTS.md`
- `apps/backoffice/AGENTS.md`
- `apps/storefront/AGENTS.md`

When working inside shared packages, follow `packages/AGENTS.md` and any package-local `AGENTS.md` files.
