# TanStack Start Patterns

Keep framework-specific behavior aligned with the existing TanStack Start setup in this app.

Route and server-function guidance:

- Keep route-level loading, error, pending, and document concerns in route files.
- Use `createServerFn` for server-side reads or actions when the surrounding feature already uses that pattern.
- Keep router context compatible with the existing root route and query provider setup.
- Do not hand-edit generated routing artifacts such as `src/routeTree.gen.ts` to register routes.

When changing route structure or framework-sensitive files, verify with `pnpm build`.

## TanStack Router / Query Data-Loading Rules

* **Route loaders should block only on route-critical data.** Do not await section-level or interactive query data in a route loader unless the page cannot correctly render without it.

* **Treat route entry and same-route updates differently.** For URL-backed filters/search/pagination, use Router lifecycle context such as `enter` / `preload` / `stay` when appropriate. Initial entry may preload data; same-route updates should normally let mounted queries refresh without blocking the route.

* **Do not use `useSuspenseQuery` when the UX requires previous-data preservation.** If filtering, searching, or pagination should keep existing results visible while the next query loads, prefer `useQuery` with explicit loading/refresh states and compatible `placeholderData`.

* **Query boundaries and keys must match real data dependencies.** Do not create one page-wide query just because datasets appear on the same screen. Independent datasets should have independent query lifecycles, and query keys should contain only inputs that actually affect that dataset.

* **Preserve previous data only across semantically compatible states.** Before using previous/placeholder data, define which inputs establish the data's business context. Never reuse data across incompatible tenant, branch, entity, period, pricing, availability, or similar context changes.

* **Do not patch loading-ownership problems with UI workarounds.** Avoid using `startTransition`, manual scroll restoration, artificial skeleton height, or similar techniques merely to hide disruptive loading behavior. First fix which layer owns the request and whether already-visible content should remain mounted.
