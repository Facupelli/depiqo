# Agent Context

Backoffice application for tenant administrators and staff of the equipment rental platform. It owns internal operations and administration.

Built with TanStack Start, React 19, TypeScript, Tailwind CSS v4, Vitest, and Biome.

Run commands from `apps/backoffice/` unless there is a clear reason to do otherwise.

Use `pnpm`.

Common app commands:

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm check`

For authenticated browser verification with `chrome-devtools-axi`, follow `docs/agent-rules/testing.md`, including its credential-handling instructions.

## Naming

Use kebab-case for all filenames in the project (for example `branch-selector.tsx`, `settings-secondary-nav.tsx`).

Use local config and nearby code as the primary source of truth:

- `package.json`
- `biome.json`
- `tsconfig.json`
- `vite.config.ts`

Use `docs/agent-rules/` for app-specific implementation rules and workflows.

For date, time, timezone, calendar, scheduling, or timestamp work, read `docs/agent-rules/dates-and-timezones.md`.

Always start with `docs/agent-rules/architecture.md`, then load any additional relevant documents from `docs/agent-rules/` based on the area you are changing.

Use existing skills for specialized workflows:

- `react-modular-architecture` for substantial React feature work
- `tanstack-query` for TanStack Query and server-state patterns
- `react-use-effect-guard` for React component and hook work
- `css-layout-guide` for layout and Tailwind structure decisions
- `zustand-store-design` for Zustand store design or review

Do not hand-edit generated files such as `src/routeTree.gen.ts` unless the task explicitly requires it.
