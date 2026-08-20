# Frontend Conventions

Use local config and nearby code as the source of truth for formatting, imports, and naming, unless an existing pattern conflicts with the current Backoffice architecture rules.

## Formatting and imports

* Let Biome handle formatting, import ordering, and lint-driven cleanup.
* Do not manually reformat generated files.
* Prefer the `@/` alias for imports from `src/` when it is clearer than a deep relative path.
* Use workspace packages such as `@repo/api-contracts` and other `@repo/*` packages for shared contracts.
* Use `import type` for type-only imports.
* Keep very local relative imports when that is already the surrounding pattern, especially around generated neighbors such as `./routeTree.gen`.

## TypeScript expectations

* Preserve strict typing from the shared TypeScript config.
* Prefer concrete domain types over loose records or `unknown` plumbing.
* Avoid `any`; if it is unavoidable, keep it narrow and local.
* Prefer schema-derived types such as `z.infer<typeof schema>` when the schema already defines the contract.
* Reuse shared DTOs and response types from `@repo/api-contracts` when the backend contract already exists.
* Add explicit helper return types when inference is unclear.

Backend DTO terminology may remain inside API integration code when it reflects the actual backend contract.

Do not automatically propagate backend terminology into frontend domain models, component names, route names, labels, or module boundaries.

When a backend contract exposes implementation-oriented concepts that are not useful product language, translate them at the frontend boundary into the tenant-facing concept used by the Backoffice.

## Business naming

Prefer names based on the language used by tenant users.

Examples include:

```text
rentals
products
inventory
customers
pricing
settings
branches
team
equipment
equipment units
price plans
signature requests
```

Do not organize frontend business code around backend bounded-context names such as:

```text
rental-commitment
rental-catalog
asset-inventory
tenant-management
offering-setup
```

unless the name is specifically required inside backend integration infrastructure.

The frontend is allowed to compose several backend bounded contexts to implement one tenant-facing workflow.

## File conventions

Use existing local conventions where applicable:

* `*.queries.ts` for TanStack Query factories and hooks.
* `*.api.ts` for backend API access.
* `*.schema.ts` for Zod schemas.
* `*.utils.ts` for general helpers.
* Components use PascalCase.
* Exported hooks use `useX`.
* Schemas end in `Schema`.
* Types use PascalCase.
* Match nearby constant naming instead of introducing `SCREAMING_SNAKE_CASE` where the module does not already use it.

Keep files close to the vertical slice that owns them.

For example:

```text
src/modules/products/create-product/
  CreateProductForm.tsx
  create-product.api.ts
  create-product.queries.ts
  create-product.schema.ts
```

Do not create module-wide `components/`, `hooks/`, `queries/`, or `api/` buckets merely because code belongs to those technical categories.

Promote code to module-level shared locations only after multiple slices actually need it.

## Module imports

Business-specific frontend code belongs under `src/modules/`.

Prefer importing another module through its explicit public entrypoint instead of reaching into private slice internals.

Avoid circular dependencies between modules.

If two modules repeatedly need the same business-specific implementation, reconsider which module should own it before moving it to `shared`.

`src/shared/`, `src/components/`, and `src/lib/` must not become escape hatches for code whose actual owner is a business module.

## Representative locations

* route files and route-level composition: `src/routes/`
* tenant-facing business modules: `src/modules/`
* shared UI primitives: `src/components/ui/`
* domain-agnostic shared frontend code: `src/shared/`
* application and infrastructure helpers: `src/lib/`
* framework integrations: `src/integrations/`
* shared backend contracts: `@repo/api-contracts`

Do not add new business functionality to legacy `src/features/`. Place new work in its owning `src/modules/<module>/` boundary.

For React feature structure, layering, and component responsibility boundaries, use the `react-modular-architecture` skill.

For TanStack Query-specific structure and query key rules, use the `tanstack-query` skill.

For new shadcn components, use the latest CLI form:

```bash
pnpm dlx shadcn@latest add <component>
```


