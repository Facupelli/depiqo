# Storefront

Customer-facing equipment rental application built with TanStack Start, React, Tailwind CSS, and Cloudflare Workers.

This package currently provides the production application shell and a `/health` SSR and hydration smoke page. Customer storefront routes will be migrated in later phases.

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

## Environment

Copy `.env.example` to `.env.local` for local development and provide:

- `BACKEND_URL`
- `BFF_INTERNAL_TOKEN`
- `STOREFRONT_TENANT_JWT_SECRET`
- `STOREFRONT_TENANT_JWT_ISSUER`
- `STOREFRONT_TENANT_JWT_AUDIENCE`
- `VITE_R2_PUBLIC_URL`
- `VITE_BRANDING_R2_PUBLIC_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SHARED_AUTH_ORIGIN`

Google OAuth is centralized at `${VITE_SHARED_AUTH_ORIGIN}/auth/google/callback`. Production must set `VITE_SHARED_AUTH_ORIGIN` to `https://auth.depiqo.com`; the Google Console and backend `GOOGLE_OAUTH_REDIRECT_URI` must both use exactly `https://auth.depiqo.com/auth/google/callback`.

Server and client variables are validated independently. `BACKEND_URL` must contain only a scheme, hostname, and optional port. `BFF_INTERNAL_TOKEN` and `STOREFRONT_TENANT_JWT_SECRET` are server-only credentials and must be configured as Cloudflare Worker secrets, never as Wrangler variables or `VITE_` variables. The JWT issuer and audience are regular server-only variables.

For a deployed Worker, provision credentials outside source control:

```bash
wrangler secret put BFF_INTERNAL_TOKEN
wrangler secret put STOREFRONT_TENANT_JWT_SECRET
```

## Health check

Open `/health`. The status is rendered by the Worker, while the hydration control verifies that React attached successfully in the browser. This route bypasses tenant resolution.

All other application requests resolve their normalized `Host` through the trusted backend tenant resolver. Unknown and admin hosts are rejected before storefront routes render. Tenant-scoped backend calls use a short-lived server-signed tenant-context token.

## Deployment

`pnpm deploy` creates the production bundle and deploys the `repo-storefront` Worker. Cloudflare routing assigns the apex and tenant storefront traffic to this Worker, while `app.depiqo.com` remains assigned to backoffice.
