# Frontend Conventions

Use local config and nearby code as the source of truth for formatting, imports, and naming.

Formatting and imports:

- Let Biome handle formatting, import ordering, and lint-driven cleanup.
- Do not manually reformat generated files.
- Prefer the `@/` alias for imports from `src/` when it is clearer than a deep relative path.
- Use workspace packages such as `@repo/api-contracts`, `@repo/schemas`, and other `@repo/*` packages for shared contracts.
- Use `import type` for type-only imports.
- Keep very local relative imports when that is already the surrounding pattern, especially around generated neighbors such as `./routeTree.gen`.

TypeScript expectations:

- Preserve strict typing from the shared TypeScript config.
- Prefer concrete domain types over loose records or `unknown` plumbing.
- Avoid `any`; if it is unavoidable, keep it narrow and local.
- Prefer schema-derived types such as `z.infer<typeof schema>` when the schema already defines the contract.
- Reuse shared DTOs and response types from `@repo/api-contracts` or `@repo/schemas` when the backend contract already exists.
- Add explicit helper return types when inference is unclear.

Naming and file conventions:

- Use `*.queries.ts` for feature query factories and hooks when that pattern already exists.
- Use `*.api.ts` for server function wrappers and API calls.
- Use `*.schema.ts` for Zod schemas.
- Use `*.utils.ts` for general helpers.
- Keep components in PascalCase, exported hooks as `useX`, schemas ending in `Schema`, and types in PascalCase.
- Match nearby constant naming instead of introducing `SCREAMING_SNAKE_CASE` where the feature does not already use it.

Representative examples:

- route file shape: `src/routes/__root.tsx`
- feature-owned API and query patterns: `src/features/`
- shared UI primitives: `src/components/ui/`
- shared workspace contracts: `@repo/api-contracts` and `@repo/schemas`

For React feature structure, layering, and component responsibility boundaries, use the `react-modular-architecture` skill.

For TanStack Query-specific structure and query key rules, use the `tanstack-query` skill.

For new shadcn components, use the latest CLI form: `pnpm dlx shadcn@latest add <component>`.
