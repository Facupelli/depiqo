# Agent Context

Customer-facing, multi-tenant storefront application for the equipment rental platform. It owns tenant landing pages, the rental catalog, cart and checkout, customer authentication and onboarding, and public document signing.

Built with TanStack Start, React 19, TypeScript, Tailwind CSS v4, Vitest, and Biome.

Run commands from `apps/storefront/` and use `pnpm`.

Common commands:

- `pnpm dev`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm check`
- `pnpm build`

Use local config and nearby code as the primary source of truth:

- `package.json`
- `biome.json`
- `tsconfig.json`
- `vite.config.ts`
- `wrangler.jsonc`

Architecture:

- `src/routes/` contains route files and route-level composition.
- `src/modules/` contains storefront-owned domain modules.
- `src/components/` contains reusable app-level components.
- `src/shared/` contains cross-cutting code with no domain ownership.
- `src/shared/server/` contains Storefront server transport and infrastructure.
- `src/integrations/` contains framework integrations.

Tenant and security boundaries:

- Preserve trusted server-side tenant resolution and signed tenant-context transport.
- Do not expose backend credentials, BFF credentials, or tenant-token signing secrets to browser code.
- Keep tenant-scoped backend access inside Storefront server boundaries.
- Treat customer session cookies and CSRF handling as an explicit security boundary.
- Do not hand-edit generated files such as `src/routeTree.gen.ts` unless the task explicitly requires it.

Use existing skills for specialized workflows:

- `react-modular-architecture` for substantial React feature work
- `tanstack-query` for TanStack Query and server-state patterns
- `react-use-effect-guard` for React component and hook work
- `css-layout-guide` for layout and Tailwind structure decisions
- `zustand-store-design` for Zustand store design or review
