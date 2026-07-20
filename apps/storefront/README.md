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
- `VITE_R2_PUBLIC_URL`
- `VITE_BRANDING_R2_PUBLIC_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SHARED_AUTH_ORIGIN`

Server and client variables are validated independently. `BACKEND_URL` must contain only a scheme, hostname, and optional port.

## Health check

Open `/health`. The status is rendered by the Worker, while the hydration control verifies that React attached successfully in the browser.

## Deployment

`pnpm deploy` creates the production bundle and deploys the `repo-storefront` Worker. Cloudflare routing assigns the apex and tenant storefront traffic to this Worker, while `app.depiqo.com` remains assigned to backoffice.
