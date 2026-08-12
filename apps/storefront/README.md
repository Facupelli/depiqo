# Storefront

Customer-facing equipment rental application built with TanStack Start, React, Tailwind CSS, and Cloudflare Workers.

Storefront owns tenant landing pages, catalog and availability, cart and checkout, customer authentication and onboarding, customer self-service, and public document signing.

## Commands

Run commands from `apps/storefront/`:

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm deploy
```

The development server listens on `http://localhost:3002`.

## TanStack dependency maintenance

TanStack Start/Router packages are intentionally pinned to exact, coordinated versions. Do not upgrade these packages independently. The current versions avoid a known SSR query-stream regression in newer Router core versions that can leave responses hanging when using `react-router-ssr-query` with loader-prefetched TanStack Query data.

Upgrade the TanStack Start/Router set only as a coordinated group and revalidate Storefront SSR routes such as `/rental`.

Upstream references: TanStack Router issue #7529 and PR #7591.

## Environment

Copy `.env.example` to `.env.local` for local development. Required variables are:

- `BACKEND_URL`
- `PUBLIC_SIGNING_ORIGIN`
- `BFF_INTERNAL_TOKEN`
- `STOREFRONT_TENANT_JWT_SECRET`
- `STOREFRONT_TENANT_JWT_ISSUER`
- `STOREFRONT_TENANT_JWT_AUDIENCE`
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_CUSTOMERS_ACCESS_KEY_ID`
- `R2_CUSTOMERS_SECRET_ACCESS_KEY`
- `R2_CUSTOMERS_BUCKET_NAME`
- `VITE_R2_PUBLIC_URL`
- `VITE_BRANDING_R2_PUBLIC_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SHARED_AUTH_ORIGIN`

`BACKEND_URL` must contain only a scheme, hostname, and optional port. `BFF_INTERNAL_TOKEN` and `STOREFRONT_TENANT_JWT_SECRET` are server-only credentials. Configure them as Cloudflare Worker secrets, never as Wrangler variables or `VITE_` variables.

Google OAuth is centralized at `${VITE_SHARED_AUTH_ORIGIN}/auth/google/callback`. Production must use `https://auth.depiqo.com` for `VITE_SHARED_AUTH_ORIGIN`, the Google Console redirect URI, and the backend `GOOGLE_OAUTH_REDIRECT_URI`.

## Host resolution

`/health` bypasses tenant resolution. Other requests resolve their normalized host through the trusted backend tenant resolver. Unknown and admin hosts are rejected before Storefront routes render.

The intended deployment topology is:

- `sign.depiqo.com` -> `repo-storefront` public signing
- Default tenant, tenant-subdomain, and verified custom Storefront hosts -> `repo-storefront`
- `app.depiqo.com` -> `repo-backoffice`

The legacy single `repo-web` production Worker migration is still pending. This topology must not be treated as the current production state until the Workers and Cloudflare routes have been migrated. The eventual production configuration must give the explicit Backoffice `app.depiqo.com` route precedence over Storefront wildcard traffic.

## Deployment

`pnpm deploy` builds and deploys the `repo-storefront` Worker according to `wrangler.jsonc`. Do not deploy as part of ordinary local validation.
