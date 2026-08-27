# Agent Context

Storefront is the customer-facing TanStack Start application for the equipment rental platform. It owns public tenant experiences, customer authentication and self-service, checkout, and public document signing.

Run commands from `apps/storefront/` using `pnpm`.

## Documentation Map

Load the additional rule documents relevant to the change.

| Need                                                                      | Read                                      |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| TanStack Start routing, loaders, server functions, and framework patterns | `docs/agent-rules/tanstack-start.md`      |
| Date, time, schedule-slot, calendar, pricing, cart, or rental-request work | `docs/architecture/temporal-semantics.md` |

## Validation

- `pnpm typecheck`
- `pnpm lint`
- `pnpm check`
- `pnpm test`
- `pnpm build`

Run the narrowest relevant commands for the change. Do not deploy or mutate Cloudflare resources unless the user explicitly authorizes it.

## Naming

Use kebab-case for all filenames in the project (for example `branch-selector.tsx`, `rental-summary-screen.tsx`).

## Architecture

For date, time, schedule-slot, calendar, pricing, cart, or rental-request changes, read `docs/architecture/temporal-semantics.md`.

- Keep route files in `src/routes/` focused on route composition.
- Keep business capabilities in `src/modules/` with colocated UI, API, schema, and mapping code.
- Use the existing Storefront BFF boundaries for backend access. Do not expose server credentials to the client.
- Preserve host resolution and trusted tenant-context boundaries. Browser-supplied tenant identity is not trusted.
- Public signing uses the dedicated public-token transport and must not depend on customer sessions or tenant host resolution.

## Worker configuration

`wrangler.jsonc` expresses the intended topology: `app.depiqo.com` belongs to Backoffice, while public signing and Storefront tenant hosts belong to Storefront. Cloudflare route changes are operational work and must be explicitly authorized.

Do not hand-edit generated files such as `src/routeTree.gen.ts`. Regenerate `worker-configuration.d.ts` with `pnpm exec wrangler types` after changing Worker configuration.
