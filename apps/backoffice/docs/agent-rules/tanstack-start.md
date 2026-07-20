# TanStack Start Patterns

Keep framework-specific behavior aligned with the existing TanStack Start setup in this app.

Route and server-function guidance:

- Keep route-level loading, error, pending, and document concerns in route files.
- Use `createServerFn` for server-side reads or actions when the surrounding feature already uses that pattern.
- Keep router context compatible with the existing root route and query provider setup.
- Do not hand-edit generated routing artifacts such as `src/routeTree.gen.ts` to register routes.

When changing route structure or framework-sensitive files, verify with `pnpm build`.
