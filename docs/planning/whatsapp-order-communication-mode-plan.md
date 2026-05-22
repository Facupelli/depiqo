# WhatsApp Order Communication Mode Plan

## Purpose

Plan the work required to support a tenant-level WhatsApp-centric order flow where customer orders are still created in the platform, but post-checkout communication moves from automatic email to manual WhatsApp chat with the tenant.

## Target Behavior

A tenant can operate in one of two order communication modes:

- `FORMAL`: current behavior. Customer creates the order, is redirected to the in-app confirmation screen, and automatic emails continue to work normally.
- `WHATSAPP`: customer creates the order, all automatic emails are suppressed, and the storefront redirects the customer straight to WhatsApp with a prefilled Spanish message to the tenant's WhatsApp number.

WhatsApp mode invariants:

- The backend still creates the order with the same business rules as today.
- Order status behavior does not change.
- Booking mode behavior does not change.
- The tenant must have a configured WhatsApp number when `orderCommunicationMode = WHATSAPP`.
- The stored WhatsApp number should be sanitized to a canonical format compatible with `wa.me`.
- The WhatsApp message is backend-generated.
- The storefront should receive the next-step instruction from the backend and redirect accordingly.
- In WhatsApp mode, all automatic order-related emails are suppressed.
- If the customer abandons WhatsApp without sending the message, the created order remains valid.
- The storefront can optionally show a floating WhatsApp contact button based on an independent tenant setting.

## Confirmed Product Decisions

- The new tenant config field should be explicit to avoid confusion with existing `bookingMode`.
- Recommended technical field: `orderCommunicationMode`.
- Allowed values: `FORMAL`, `WHATSAPP`.
- The admin UI label can be Spanish, e.g. `Modo de comunicación de pedidos`.
- WhatsApp mode is tenant-wide.
- Tenant admins must provide the WhatsApp number in the same config form when selecting WhatsApp mode.
- The admin UI should provide help text for international format and sanitize/validate on submit.
- The WhatsApp number is public and may be exposed to the storefront if needed.
- The storefront floating WhatsApp button should reuse tenant config and be controlled by an independent toggle.

## Current State Audit

### Already present

- Tenant config already exists as a JSON-backed value object and shared schema.
- Backend notifications already flow through a notification orchestrator, which is a good suppression point.
- Storefront cart flow already creates the order successfully.
- Create-order response already returns `{ orderId, status }`.
- Storefront already has a WhatsApp floating button component, but it is currently hardcoded.
- Tenant storefront rental config fetch already exposes pricing and booking mode.

### Gaps for this feature

- Tenant config does not currently model an order communication mode.
- Tenant config does not currently store a WhatsApp number.
- Shared tenant schemas do not expose these settings.
- Admin tenant config form does not allow configuring these settings.
- Storefront cart flow always navigates to the confirmation page after order creation.
- Create-order response does not yet tell the frontend what the required next step is.
- Notification orchestration does not yet suppress all emails based on tenant order communication mode.
- The existing floating WhatsApp button is not tenant-configured.
- Create-order idempotency must be addressed as part of this feature.

---

## Step 1 - Finalize Data Contract

Goal: define the new tenant and checkout contract cleanly before implementation.

Tasks:

- [ ] Add `orderCommunicationMode` to tenant config with values `FORMAL | WHATSAPP`.
- [ ] Add `whatsAppNumber` to tenant config as an optional canonical sanitized string, required when mode is `WHATSAPP`.
- [ ] Add an independent storefront flag such as `showFloatingWhatsAppButton` to tenant config.
- [ ] Define backward-compatible defaults:
  - `orderCommunicationMode = FORMAL`
  - `whatsAppNumber = undefined`
  - `showFloatingWhatsAppButton = false`
- [ ] Extend shared tenant schemas and DTOs with the new fields.
- [ ] Extend create-order response so backend can instruct the frontend on the next step.

Recommended create-order response direction:

- keep `orderId` and `status`
- add mode-aware post-submit metadata, e.g. a `nextStep` / redirect payload
- in WhatsApp mode, include the full `whatsappUrl`

Verification:

- Existing tenants remain valid without data migration failures.
- Existing `FORMAL` tenants preserve current behavior by default.

## Step 2 - Backend Tenant Config Support

Goal: make tenant settings authoritative and validated in the backend.

Tasks:

- [ ] Extend tenant config value object and validation rules.
- [ ] Enforce that `whatsAppNumber` is required when `orderCommunicationMode = WHATSAPP`.
- [ ] Sanitize and validate the WhatsApp number for `wa.me` usage.
- [ ] Ensure reconstitution of legacy tenant configs remains backward compatible.
- [ ] Update tenant config query/update flows and tests.

Verification:

- Invalid WhatsApp-mode config without number is rejected.
- Legacy tenants load with default formal mode.
- Canonical number storage is consistent.

## Step 3 - Backend Order Creation Response

Goal: let checkout branch from backend truth instead of frontend guesses.

Tasks:

- [ ] Load tenant `orderCommunicationMode` during create-order completion.
- [ ] In `FORMAL` mode, keep the current checkout continuation semantics.
- [ ] In `WHATSAPP` mode, build a backend-owned Spanish WhatsApp message from the created order.
- [ ] Return a frontend-ready redirect instruction, including full `whatsappUrl`.
- [ ] Ensure the message includes:
  - order number
  - customer/account identity
  - order contact details
  - pickup/return dates and times
  - fulfillment details
  - delivery address if applicable
  - line items and quantities
  - notes/instructions if available
  - total amount

Verification:

- Create-order returns deterministic next-step data for both modes.
- WhatsApp message content is readable and formatted for WhatsApp.

## Step 4 - Notification Suppression Policy

Goal: make WhatsApp mode fully disable automatic email communication.

Tasks:

- [ ] Update notification channel/policy resolution to read tenant order communication mode.
- [ ] Suppress all automatic emails when tenant mode is `WHATSAPP`.
- [ ] Confirm suppression applies beyond order-created events, not only checkout confirmation.
- [ ] Keep `FORMAL` mode unchanged.

Verification:

- WhatsApp-mode tenants send no automatic emails.
- Formal-mode tenants keep current notification behavior.

## Step 5 - Storefront Checkout UX

Goal: make the customer flow clearly mode-aware.

Tasks:

- [ ] Expose order communication settings in the storefront tenant config query or equivalent public config surface.
- [ ] Update storefront hooks/types to consume the new settings.
- [ ] Change cart CTA copy when WhatsApp mode is enabled to explicitly mention WhatsApp.
- [ ] After successful order creation:
  - `FORMAL` mode → navigate to confirmation page
  - `WHATSAPP` mode → redirect straight to returned `whatsappUrl`
- [ ] Avoid showing the normal success screen in WhatsApp mode.

Verification:

- Formal mode preserves current checkout UX.
- WhatsApp mode redirects directly to WhatsApp Web/app on desktop/mobile.

## Step 6 - Admin Tenant Config UX

Goal: allow tenant admins to configure the mode safely.

Tasks:

- [ ] Extend the tenant config form with:
  - order communication mode selector
  - WhatsApp number field
  - floating WhatsApp button toggle
- [ ] Make the WhatsApp number required when WhatsApp mode is selected.
- [ ] Add Spanish help text explaining the expected international format.
- [ ] Sanitize/validate on submit.
- [ ] Show explanatory mode copy so admins understand the operational tradeoff.

Suggested admin copy direction:

- `Formal`: el cliente finaliza el pedido y recibe confirmaciones automáticas por email.
- `WhatsApp`: el cliente crea el pedido y es redirigido a WhatsApp para continuar la comunicación manualmente con el negocio.

Verification:

- Admin can save formal mode without number.
- Admin cannot save WhatsApp mode without a valid number.
- Saved values reload correctly.

## Step 7 - Storefront Floating WhatsApp Button

Goal: make the existing WhatsApp contact affordance tenant-driven.

Tasks:

- [ ] Replace the hardcoded floating button number/message source with tenant config.
- [ ] Gate rendering behind `showFloatingWhatsAppButton` and configured number.
- [ ] Use Spanish copy.
- [ ] Keep this behavior independent from checkout mode so tenants can use the button in either mode.

Verification:

- Button does not render unless enabled and configured.
- Button opens the tenant's configured WhatsApp chat.

## Step 8 - Create-Order Idempotency

Goal: prevent accidental duplicate orders, especially in the redirect-based WhatsApp flow.

Tasks:

- [ ] Audit the current create-order path for duplicate-submission risk.
- [ ] Introduce explicit idempotency for customer checkout order creation.
- [ ] Ensure repeated submissions from refresh/double-click/retry do not create duplicate orders.
- [ ] Define how the frontend supplies or reuses the idempotency key.
- [ ] Ensure the idempotent response still returns the same redirect metadata when the original order already exists.

Verification:

- Repeated identical submission creates one order only.
- Retry returns stable response data.
- WhatsApp redirect remains deterministic under retries.

## Step 9 - Testing

Goal: prove the new mode works without regressions.

Tasks:

- [ ] Backend unit tests for tenant config defaults, validation, and normalization.
- [ ] Backend integration tests for create-order in both communication modes.
- [ ] Backend integration tests for notification suppression in WhatsApp mode.
- [ ] Backend integration tests for idempotent order creation.
- [ ] Frontend tests for mode-aware CTA and redirect behavior.
- [ ] Frontend tests for admin config validation.
- [ ] Manual E2E script:
  1. Configure tenant in `FORMAL` mode and verify current flow still works.
  2. Switch tenant to `WHATSAPP` mode with valid number.
  3. Submit cart checkout.
  4. Verify only one order is created.
  5. Verify no automatic emails are sent.
  6. Verify redirect opens WhatsApp with prefilled Spanish message.
  7. Verify the order remains created even if the customer does not send the WhatsApp message.
  8. Verify storefront floating button behavior with toggle on/off.

## Step 10 - Rollout Plan

Goal: ship safely with no regressions for existing tenants.

Tasks:

- [ ] Keep default mode as `FORMAL`.
- [ ] Deploy backend/shared schema changes before enabling admin UI usage.
- [ ] Deploy storefront support after backend redirect contract is available.
- [ ] Test on one internal tenant first.
- [ ] Validate both desktop and mobile WhatsApp redirect behavior.
- [ ] Validate no automatic emails are emitted in WhatsApp mode.
- [ ] Validate idempotent create-order behavior before pilot rollout.

Launch checklist:

- [ ] Tenant config supports `orderCommunicationMode`.
- [ ] WhatsApp mode requires a valid canonical number.
- [ ] Checkout redirects directly to WhatsApp in WhatsApp mode.
- [ ] Automatic emails are fully suppressed in WhatsApp mode.
- [ ] Formal mode remains unchanged.
- [ ] Floating WhatsApp button is tenant-configurable.
- [ ] Create-order is idempotent.
