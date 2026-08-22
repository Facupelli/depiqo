# Testing And Verification

When validating a change, start with the smallest relevant command and broaden only if needed.

Common commands:

- `pnpm lint` for style and correctness checks
- `pnpm check` for formatting, linting, and import organization together
- `pnpm test` for the default Vitest run
- `pnpm build` for routing, server-function, config, or production-sensitive changes
- workspace `pnpm build` or `pnpm lint` when a change in `apps/backoffice/` also modifies shared packages under `packages/`

Focused Vitest examples:

- `pnpm vitest run src/path/to/file.test.ts`
- `pnpm vitest run src/path/to/file.spec.tsx`
- `pnpm vitest run -t "exact test name"`
- `pnpm vitest run src/path/to/file.test.ts -t "test name"`

Use focused tests when behavior changes are local. Run `pnpm build` when route registration, SSR behavior, generated framework artifacts, or app configuration may be affected.

If a change touches `@repo/api-contracts`, treat it as a cross-workspace change and validate the affected shared package plus the web app consumer path.

## Authenticated Browser Verification

Use `chrome-devtools-axi` for end-to-end browser verification. Protected backoffice routes redirect unauthenticated users to `/login`.

Local credentials are stored in the ignored `apps/backoffice/.env.agent.local` file:

* `AXI_ADMIN_EMAIL`
* `AXI_ADMIN_PASSWORD`

Never print, inspect, commit, or copy their values into tracked files. When authentication is required, obtain fresh element references with `snapshot`, then source the credentials and fill the form within the same shell invocation:

```bash
source apps/backoffice/.env.agent.local

npx -y chrome-devtools-axi fill @<email-ref> "$AXI_ADMIN_EMAIL"
npx -y chrome-devtools-axi fill @<password-ref> "$AXI_ADMIN_PASSWORD"
npx -y chrome-devtools-axi click @<submit-ref>
```

Confirm that login succeeded before continuing. The browser remains authenticated for the active AXI session, so log in only when necessary.

Customer portal credentials for `/login` are not configured. Do not reuse the backoffice credentials there.
