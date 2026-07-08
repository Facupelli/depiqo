# Testing And Verification

When validating a change, start with the smallest relevant command and broaden only if needed.

Common commands:

- `pnpm lint` for style and correctness checks
- `pnpm check` for formatting, linting, and import organization together
- `pnpm test` for the default Vitest run
- `pnpm build` for routing, server-function, config, or production-sensitive changes
- workspace `pnpm build` or `pnpm lint` when a change in `apps/web/` also modifies shared packages under `packages/`

Focused Vitest examples:

- `pnpm vitest run src/path/to/file.test.ts`
- `pnpm vitest run src/path/to/file.spec.tsx`
- `pnpm vitest run -t "exact test name"`
- `pnpm vitest run src/path/to/file.test.ts -t "test name"`

Use focused tests when behavior changes are local. Run `pnpm build` when route registration, SSR behavior, generated framework artifacts, or app configuration may be affected.

If a change touches `@repo/api-contracts` or `@repo/schemas`, treat it as a cross-workspace change and validate the affected shared package plus the web app consumer path.
