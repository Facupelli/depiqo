# Web Architecture

Treat `apps/web/` as a route-driven frontend app with TanStack Start routing and feature-oriented UI.

Follow the surrounding feature structure before introducing a new pattern. For new backend-v2/backoffice work, prefer the new `src/v2/features/` direction.

Core expectations:

- Treat each feature as a vertical slice that owns its UI, data access, schemas, local hooks, and DTO mapping.
- Organize new v2 work by business capability, not by technical concern or entity-only folders.
- Keep reusable primitives and domain-agnostic helpers in shared locations rather than duplicating them per feature.
- Prefer feature public APIs over reaching into another feature's internals.
- Do not apply backend NestJS layering or naming patterns to this app.
- Do not edit generated files unless the task explicitly requires it.

For substantial React feature work, use the `react-modular-architecture` skill.

Folder roles:

- `src/routes/` holds route files and route-level composition.
- `src/features/` holds existing frontend feature slices.
- `src/v2/features/` holds new backend-v2 feature slices, grouped by bounded context and business action.
- `src/shared/` holds truly cross-cutting code with no domain ownership.
- `src/components/ui/` holds shared UI primitives.
- `src/components/` holds app-level reusable components.
- `src/lib/` and `src/integrations/` hold infrastructure helpers and framework integrations.

Feature boundaries:

- A feature maps to a bounded frontend domain and should own its code end to end.
- Prefer slice folders like `create-rentable-equipment/`, `cancel-order/`, or `manage-locations/` over broad `components/`, `hooks/`, `api/` buckets.
- Do not create a feature folder preemptively; add one when the domain actually exists.
- If one feature needs code from another, prefer that feature's public API. If that is not enough, the code likely belongs in a shared location or the boundaries need reconsideration.
- Domain-specific request code should stay inside the owning feature's API layer instead of being scattered across UI files.
- For v2 backoffice SPA work, call the backend directly from feature API primitives; do not introduce TanStack Start server functions unless the feature explicitly requires server-side behavior.

Aggregator pages:

- Pages that compose multiple domains can have their own feature slice.
- Aggregator features should compose through other features' public entrypoints instead of reaching into private internals.

Primary app areas:

- `src/routes/` for route files and route-level composition
- `src/features/` for existing feature-owned code
- `src/v2/features/` for new backend-v2 vertical slices
- `src/components/ui/` for shared UI primitives
- `src/components/` for app-level reusable components
- `src/shared/` and `src/lib/` for shared hooks, utilities, contexts, and infrastructure helpers
- `src/integrations/` for framework integrations such as TanStack Query
