# Backoffice and Storefront Migration TODOs

## Audit summary

Storefront currently owns tenant resolution and the tenant BFF, landing pages, the catalog, availability, cart persistence, schedule-slot selection, delivery details, and price preview.

Backoffice retains the complete admin application, but it also retains the prior public portal implementation. Storefront is therefore incomplete and Backoffice has duplicated, stale public code.

## 1. Define and enforce app ownership

- [ ] Declare Backoffice ownership: admin auth, dashboard, inventory, catalog setup, branches, owners, pricing and promotions, rental operations, customer approvals, tenant settings, internal document actions, and admin uploads.
- [ ] Declare Storefront ownership: tenant landing, catalog, cart, checkout, customer portal and auth, onboarding, public signing, and public document downloads.
- [ ] Define final public URLs, including `auth.depiqo.com`, tenant domains, the platform domain, and signing links.
- [ ] Decide the fate of legacy public routes: `/order-confirmation`, `/order-created-whatsapp`, and `/order-created-contact-team`. They remain in Backoffice but have no active caller in the current checkout flow.

## 2. Add an authenticated Storefront backend boundary

- [ ] Design a same-origin Storefront BFF or proxy for customer-authenticated requests.
- [ ] Forward customer session cookies and CSRF data, preserve backend `Set-Cookie` responses, and attach trusted tenant context server-side.
- [ ] Keep the existing signed tenant transport for anonymous tenant-scoped reads.
- [ ] Add a separate public-token transport for signing links, which must work on the platform host without a customer session or tenant hostname.
- [ ] Do not copy Backoffice `apiFetch` unchanged. It depends on Backoffice `/backend/$`; Storefront currently has no equivalent and its existing BFF deliberately does not forward cookies.

## 3. Complete checkout in Storefront

- [ ] Port the confirmed-rental command from `apps/backoffice/src/features/rental-commitment/confirmed-rentals/create-confirmed-rental`.
- [ ] Port the checkout state machine from Backoffice `cart/create-confirmed-rental`: selected pickup and return slots, insurance, delivery validation, request-body mapping, and backend error mapping.
- [ ] Add the booking CTA, pending state, authentication redirect, availability-conflict handling, delivery fallback, idempotency errors, cart clearing, and post-success navigation.
- [ ] Preserve the DST-safe slot semantics added after the split.
- [ ] Port `/confirmed-rental-success` and wire it to the new checkout command.
- [ ] Reconcile the cart implementations before porting more code. Storefront uses `rental-cart`; Backoffice still has both `v2-rental-cart` and route-backed `storefront-cart`. Retire obsolete variants rather than maintaining three carts.

## 4. Migrate customer account and onboarding

- [ ] Port customer login, logout, current-user query, CSRF state, header account action, safe redirect utilities, and portal forms.
- [ ] Add Storefront routes for `/login`, `/register`, `/onboard`, Google start, callback, finalize, and their route guards.
- [ ] Port customer profile submission and resubmission, including all five onboarding steps.
- [ ] Move the customer identity-document upload endpoint and its Better Upload and R2 server dependencies to Storefront.
- [ ] Split customer query code so Storefront receives only customer self-service APIs, while Backoffice retains approval, review, and staff customer-management APIs.
- [ ] Verify Google handoff across tenant hosts and `VITE_SHARED_AUTH_ORIGIN`.

## 5. Migrate public document signing

- [ ] Move `/signing`, public signing queries and mutation, signature-pad dependencies, and terminal-state UI to Storefront.
- [ ] Move `/api/document-signing/public/unsigned-pdf` and `/api/document-signing/public/signed-pdf` to Storefront.
- [ ] Preserve token validation, no-store PDF headers, signed-PDF download behavior, and expired, already-signed, and error states.
- [ ] Keep Backoffice-only signing invitation and rental-detail actions in Backoffice.

## 6. Remove Storefront duplication from Backoffice

After the equivalent Storefront routes pass E2E verification:

- [ ] Delete Backoffice `_portal` routes, public Google routes, and `/signing`.
- [ ] Delete duplicated catalog, branches, pricing-preview, cart, tenant-landing, and public tenant-config modules from Backoffice.
- [ ] Delete unused Backoffice storefront transport helpers: `storefrontApiFetch`, signed storefront-token helpers, and public storefront server functions.
- [ ] Reduce the Backoffice root context to the minimum needed for the admin host and authenticated tenant users.
- [ ] Retain Backoffice `/backend/$`, admin contract and remito endpoints, catalog and branding uploads, and staff-only customer-document access.

## 7. Finish deployment and documentation

- [ ] Update `apps/storefront/README.md`, which still says storefront routes will migrate later.
- [ ] Replace the generated-template `apps/backoffice/README.md`.
- [ ] Add the missing `apps/storefront/AGENTS.md`, referenced by the root instructions.
- [ ] Audit Worker names and routes. Backoffice is still deployed as `repo-web`; decide whether it should become `repo-backoffice`.
- [ ] Remove Storefront-only secrets and R2 credentials from Backoffice after the moved endpoints are verified.
- [ ] Verify Cloudflare route precedence so `app.depiqo.com` cannot serve Storefront routes.

## 8. Add migration acceptance coverage

Neither app currently contains app-level test files.

- [ ] Add browser E2E coverage for host resolution, tenant catalog, branch and date selection, cart persistence, and price preview.
- [ ] Cover customer login, Google handoff, onboarding, and document upload.
- [ ] Cover customer-auth tenant isolation: unknown hosts, disabled/unverified custom domains, rejected browser-supplied `tenantId`, host-scoped cookie attributes, cross-host cookie presentation, and trusted-tenant/session-tenant mismatches.
- [ ] Cover pickup and delivery checkout, backend conflicts, cart clearing, and success states.
- [ ] Cover signing link, PDF, acceptance, and terminal states.
- [ ] Cover Backoffice admin access and verify removed public paths no longer resolve there.
- [ ] Run isolated Storefront and Backoffice build, check, and test commands after each migration slice.

## Audit evidence

- Storefront checkout renders pricing and fulfillment but has no submit or booking action: `apps/storefront/src/modules/rental-commitment/cart/review-cart/cart-page.tsx`.
- The complete booking flow remains in Backoffice: `apps/backoffice/src/features/rental-commitment/cart/create-confirmed-rental`.
- Customer portal, onboarding, Google routes, signing, and public PDF endpoints remain only in `apps/backoffice/src/routes/_portal`, `routes/auth/google`, `routes/signing.tsx`, and `routes/api/document-signing`.
- Backoffice retains duplicated public catalog, cart, and tenant modules even after Storefront copies were added.
- `pnpm build` invoked workspace Turbo and did not finish within 120 seconds, so build status was not established by the audit.
