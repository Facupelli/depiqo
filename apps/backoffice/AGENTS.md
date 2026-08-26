# Agent Context

Backoffice application for tenant administrators and staff of the equipment rental platform. It owns internal operations and administration.

Built with TanStack Start, React 19, TypeScript, Tailwind CSS v4, Vitest, and Biome.

Run commands from `apps/backoffice/` unless there is a clear reason to run from the workspace root.

Use `pnpm`.

## Commands

Backoffice-local:

* `pnpm dev`
* `pnpm build`
* `pnpm test`
* `pnpm lint`
* `pnpm check`

## Documentation Map

Always start with:

```text
apps/backoffice/docs/agent-rules/architecture.md
```

Then load only the additional rule documents relevant to the change.

| Need                                                                       | Read                                       |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| Application architecture, module boundaries, and dependency rules          | `docs/agent-rules/architecture.md`         |
| API integration, contracts, mutations, and error handling                  | `docs/agent-rules/api-and-errors.md`       |
| Date, time, timezone, calendar, scheduling, or timestamp behavior          | `docs/agent-rules/dates-and-timezones.md`  |
| React, TypeScript, component, and frontend implementation conventions      | `docs/agent-rules/frontend-conventions.md` |
| TanStack Start routing, loaders, server functions, and framework patterns  | `docs/agent-rules/tanstack-start.md`       |
| Testing and authenticated browser verification                             | `docs/agent-rules/testing.md`              |
| Visual language, information hierarchy, layout, interaction, and UI states | `docs/agent-rules/ui-design.md`            |

## Local Conventions

Use kebab-case for all filenames in the project, for example `branch-selector.tsx` and `settings-secondary-nav.tsx`.

Use local configuration as the primary source of truth for tooling and project behavior:

* `package.json`
* `biome.json`
* `tsconfig.json`
* `vite.config.ts`

Do not hand-edit generated files such as `src/routeTree.gen.ts` unless the task explicitly requires it.

For authenticated browser verification with `chrome-devtools-axi`, follow `docs/agent-rules/testing.md`, including its credential-handling instructions.

