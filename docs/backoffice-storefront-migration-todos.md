# Backoffice and Storefront Migration TODOs

## Audit summary

Storefront currently owns tenant resolution and the tenant BFF, landing pages, the catalog, availability, cart persistence, schedule-slot selection, delivery details, and price preview.

Backoffice retains the complete admin application, but it also retains the prior public portal implementation. Storefront is therefore incomplete and Backoffice has duplicated, stale public code.

## 1. Define and enforce frontend application ownership

App ownership describes which TanStack Start application serves a user-facing route.
It does not change backend bounded-context ownership.

- [x] Backoffice owns tenant-admin/internal experiences:
      tenant-user auth, dashboard, inventory, catalog setup,
      branches, owners, pricing/promotions, rental operations,
      customer approvals, tenant settings, internal contract/document
      operations, and admin uploads.

- [x] Storefront owns customer/public experiences:
      tenant landing, catalog, cart, checkout, customer portal,
      customer auth/onboarding, public contract signing,
      and public document downloads.

- [ ] Define the canonical public URL map for Backoffice,
      Storefront tenant domains/custom domains, authentication,
      OAuth callbacks, signing links, and public document links.

- [ ] Audit legacy public routes:
      /order-confirmation
      /order-created-whatsapp
      /order-created-contact-team

      Delete them if unused and externally irrelevant.
      Otherwise preserve only the required compatibility redirect/page.

## 2. Add an authenticated Storefront backend boundary

- [x] Design a same-origin Storefront BFF or proxy for customer-authenticated requests.
- [x] Forward customer session cookies and CSRF data, preserve backend `Set-Cookie` responses, and attach trusted tenant context server-side.
- [x] Keep the existing signed tenant transport for anonymous tenant-scoped reads.
- [ ] Add a separate public-token transport for signing links, which must work on the platform host without a customer session or tenant hostname.
- [x] Do not copy Backoffice `apiFetch` unchanged.

## 3. Complete checkout in Storefront

- [x] Port the confirmed-rental command from `apps/backoffice/src/features/rental-commitment/confirmed-rentals/create-confirmed-rental`.
- [x] Port the checkout state machine from Backoffice `cart/create-confirmed-rental`: selected pickup and return slots, insurance, delivery validation, request-body mapping, and backend error mapping.
- [x] Add the booking CTA, pending state, authentication redirect, availability-conflict handling, delivery fallback, idempotency errors, cart clearing, and post-success navigation.
- [x] Preserve the DST-safe slot semantics added after the split.
- [x] Port `/confirmed-rental-success` and wire it to the new checkout command.
- [x] Reconcile the cart implementations before porting more code. Storefront uses `rental-cart`; Backoffice still has both `v2-rental-cart` and route-backed `storefront-cart`. Retire obsolete variants rather than maintaining three carts.

## 4. Complete customer onboarding and self-service migration

- [x] Add the Storefront customer self-service API boundary for:
  - `GET /tenant-management/rental-customers/me/profile`
  - `POST /tenant-management/customer/profile/submit`

  Use the existing session-aware Storefront BFF, extend its allowlist narrowly for these operations, reuse the existing API contracts, and preserve backend `ProblemDetailsError` responses.

- [ ] Move the customer identity-document upload flow to Storefront:
  - add the Storefront Better Upload endpoint;
  - authenticate with the customer session;
  - preserve the existing customer ID validation;
  - reuse the existing customer R2 bucket and object-key model.

  Keep Backoffice's staff-only identity-document reader and review flow unchanged.

- [ ] Add the customer-guarded Storefront `/onboard` route and profile-status experience:
  - no profile -> show the five-step onboarding form;
  - `REJECTED` -> show rejection reason and allow editing/resubmission;
  - `PENDING` -> show pending-review status;
  - `APPROVED` -> show approved status.

  Preserve the existing five onboarding steps and backend profile lifecycle rules. Do not add customer self-registration.

- [ ] Remove superseded Backoffice customer self-service code after the Storefront onboarding flow is functionally verified:
  - onboarding form;
  - profile submit mutation/API;
  - current-customer-profile query/API;
  - customer upload route.

  Retain:
  - customer list/search;
  - profile detail;
  - approval/rejection;
  - staff customer selection;
  - staff identity-document reader.

  Automated E2E coverage remains deferred to Section 8.

- [ ] Manually verify centralized Google OAuth on:
  - a tenant-slug canonical host;
  - a verified custom canonical host.

  Verify canonical-host redirects/rejection, one-time OAuth transaction consumption, one-time handoff-ticket consumption, and host-only customer session cookies. Automated coverage remains deferred to Section 8.

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
- [ ] Cover customer login, centralized Google handoff, onboarding, and document upload. Google coverage must include one-time transaction and ticket consumption, canonical-host binding, host-only session cookies, and verified custom domains.
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
