# Backoffice

Tenant administrator and staff application for DEPIQO. Built with TanStack Start, React, Tailwind CSS, and Cloudflare Workers.

The Backoffice presents DEPIQO through tenant-facing business areas rather than mirroring backend bounded contexts.

Its primary product areas are:

```text
Rentals
Products
Inventory
Customers
Pricing
Settings
```

These frontend modules describe how tenant users understand and operate the system.

Backend bounded contexts continue to own authoritative business rules and data. A Backoffice workflow may compose several backend modules when that is required to fulfill one tenant-facing action.

For example, creating or configuring a Product may involve Catalog, Asset Inventory, Pricing, Tenant Management, and Offering Setup behind one coherent Backoffice workflow.

See the Backoffice architecture documentation and the `README.md` inside each `src/modules/<module>/` directory for module responsibilities and terminology.

## Commands

Run commands from `apps/backoffice/`:

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm check
pnpm run cf-typegen
pnpm deploy
```

The development server listens on `http://localhost:3001`.

## TanStack dependency maintenance

TanStack Start/Router packages are intentionally pinned to exact, coordinated versions. Do not upgrade these packages independently. The current versions avoid a known SSR query-stream regression in newer Router core versions that can leave responses hanging when using `react-router-ssr-query` with loader-prefetched TanStack Query data.

Upgrade the TanStack Start/Router set only as a coordinated group and revalidate affected SSR routes.

Upstream references: TanStack Router issue #7529 and PR #7591.

## Environment

Server configuration is validated in `src/config/server-env.ts`. The application requires backend proxy configuration, equipment-upload credentials, and branding-upload credentials.

`CUSTOMERS_BUCKET` is a Cloudflare R2 binding used by the retained staff identity-document reader. Customer-facing document upload credentials do not belong to Backoffice.

Client configuration requires:

* `VITE_R2_PUBLIC_URL`
* `VITE_BRANDING_R2_PUBLIC_URL`

Keep server credentials in local environment files for development and Cloudflare Worker secrets for deployment. Do not expose server credentials through `VITE_` variables.

## Deployment topology

The intended deployment topology is:

* `app.depiqo.com` -> `repo-backoffice`
* `sign.depiqo.com` -> `repo-storefront` public signing
* Default tenant, tenant-subdomain, and verified custom Storefront hosts -> `repo-storefront`

The legacy single `repo-web` production Worker migration is still pending. The checked-in Worker name and route configuration express the intended future state, not a claim about the currently deployed topology. The eventual production configuration must ensure the explicit Backoffice route for `app.depiqo.com` takes precedence over Storefront wildcard traffic.

## Validation

Run `pnpm check` and `pnpm build` after Backoffice changes. Run `pnpm run cf-typegen` after changing `wrangler.jsonc` and commit the regenerated `worker-configuration.d.ts`. The command intentionally ignores local environment files so generated types reflect checked-in Worker configuration only.


