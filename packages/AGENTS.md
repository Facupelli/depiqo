# Agent Context

Shared workspace packages for reusable contracts, schemas, configuration, and test tooling.

Run commands from the specific package directory unless a workspace-level command is more appropriate.

Use `pnpm` workspaces.

Use `docs/agent-rules/shared-packages.md` for shared-package conventions and validation guidance.

Follow package-local `AGENTS.md` files when present:

- `types/AGENTS.md`
- `typescript-config/AGENTS.md`
- `jest-config/AGENTS.md`

Treat changes in `packages/` as cross-workspace changes by default because they can affect both apps.
