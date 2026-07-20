# Request-To-Book Support Plan

## Purpose

Plan the work required to make `request-to-book` a production-supported booking mode across backend, shared contracts, admin UI, storefront UI, notifications, and rollout.

Primary reference: `apps/backend/docs/system-explanations/rental-orders-and-fulfillment.md`.

## Target Behavior

A tenant can operate in either booking mode:

- `instant-book`: customer checkout creates a `CONFIRMED` order and `COMMITTED` asset assignments immediately.
- `request-to-book`: customer checkout creates a `PENDING_REVIEW` order without blocking availability and without creating asset assignments. Staff later approves or rejects the request.

Request-to-book invariants:

- Pending-review orders do **not** reserve, hold, or block assets.
- Pending-review orders should not have `HOLD` or `COMMITTED` asset assignments created at customer submission time.
- Confirming a pending-review order is the first availability-blocking step: the backend must re-check availability and create `COMMITTED` assignments transactionally.
- Approval can fail if the requested assets/items are no longer available for the requested rental window.
- Rejecting a pending-review order closes the request without releasing inventory, because no inventory was blocked.
- Pending-review orders are review work, not operational work: they should appear in review surfaces, but not active schedule/calendar surfaces.
- Customers must see copy that says their request is awaiting approval and availability confirmation, not that the rental is confirmed or reserved.

## Current State Audit

### Already present

- Shared enums include `BookingMode`, `OrderStatus.PENDING_REVIEW`, `REJECTED`, `EXPIRED`, and `OrderAssignmentStage.HOLD` / `COMMITTED`.
- Backend lifecycle commands exist for confirm, reject, cancel, activate, complete, and expire.
- Backend exposes `GET /orders/pending-review` for staff.
- Admin web app has some confirm UI that can be adapted for approval.

### Current behavior that must change for the new direction

- Backend order creation currently derives initial assignment stage from tenant `bookingMode`; request-to-book must create no asset assignments at submission time.
- Confirming pending-review orders currently promotes assignments from `HOLD` to `COMMITTED`; it must instead perform availability checks and create `COMMITTED` assignments during approval.
- Rejecting pending-review orders currently releases `HOLD` assignments; this should become a no-op for inventory because pending-review orders should have no blocking assignments.
- Availability currently treats both `HOLD` and `COMMITTED` assignments as blocking; request-to-book pending-review orders must not contribute blocking assignments.

### Main gaps before shipping request-to-book

- Admin settings UI disables `request-to-book` selection.
- Storefront only fetches tenant pricing config, not booking mode.
- Checkout success page always uses confirmed-booking copy.
- Create-order response is just an order id, so the web app cannot reliably branch on created status without another source.
- Admin web app has no dedicated pending-review queue wired to the backend endpoint.
- Admin web app has confirm UI, but no reject action wired to `POST /orders/:orderId/reject`.
- Admin web app currently offers cancel for `PENDING_REVIEW`, but backend rules should require rejection instead.
- Customer/staff notifications need request-specific and review-outcome-specific copy.

---

## Step 1 - Finalized Product Rules And Data Contract

Goal: make request-review behavior explicit and stable before changing UI.

Status: product decisions are finalized. Downstream steps should implement these rules without reopening Step 1 unless product requirements change.

Final decisions:

- Booking mode is tenant-controlled. Customers cannot choose or override booking mode per request.
- `instant-book` checkout creates a `CONFIRMED` order and `COMMITTED` asset assignments immediately.
- `request-to-book` checkout creates a `PENDING_REVIEW` order with no `HOLD` or `COMMITTED` asset assignments.
- Approval/confirmation of a `PENDING_REVIEW` order is the first availability-blocking operation:
  - re-check availability for the order's latest requested rental window and items
  - create all required `COMMITTED` assignments transactionally on success
  - if availability fails, return the existing order-unavailable problem response with `unavailableItems` / `conflictGroups`, leave the order in `PENDING_REVIEW`, and create no assignments
  - staff can then reject the request, edit dates/items if supported, or contact the customer
- Add first-release review metadata on orders:
  - `reviewedAt: Date | null`
  - `reviewedByUserId: string | null`
  - `rejectionReason: string | null`
- Approval sets `reviewedAt` and `reviewedByUserId`; it does not require a note.
- Rejection sets `reviewedAt`, `reviewedByUserId`, and optional `rejectionReason`.
- Failed approval due to availability does not set review metadata.
- Do not add `reviewNote`, approval notes, review expiry, or review deadline fields for the core request-to-book release.
- Create-order response contract becomes an object: `{ orderId: string; status: OrderStatus }`.
- Shared order response DTOs should expose created order `status` and review metadata only where needed by admin/detail/history/rejection surfaces.

Verification:

- Tenant config defaults remain backward compatible for existing tenants.
- New request-to-book orders have `PENDING_REVIEW` and no asset assignments.
- Instant-book orders remain `CONFIRMED` with `COMMITTED` assignments.
- Approval conflicts do not partially mutate the order or create assignments.
- Review metadata is populated only on successful approval or rejection.

## Step 2 - Backend API Hardening

Goal: make backend endpoints complete and safe for production request-review workflows.

Tasks:

- [ ] Replace or extend create-order response from `string` to an object such as `{ orderId, status }`.
- [ ] Keep customer checkout actor restrictions unchanged; customers should not be able to choose the mode per request.
- [ ] Update request-to-book order creation to persist order/customer/line data without creating `HOLD` or `COMMITTED` assignments.
- [ ] Update confirm pending-review flow to:
  - re-run availability checks for the requested window and items
  - create `COMMITTED` assignments transactionally on success
  - persist `reviewedAt` and `reviewedByUserId`
  - emit an approval event
  - return the order-unavailable problem response without partially mutating the order if availability fails
- [ ] Update reject pending-review flow to accept an optional `rejectionReason`, persist `reviewedAt`, `reviewedByUserId`, and `rejectionReason`, and emit a rejection event. It should not attempt to release inventory for normal request-to-book orders.
- [ ] Ensure cancel remains invalid for `PENDING_REVIEW` orders.
- [ ] Ensure edit/accessory assignment flows respect the new lifecycle:
  - pending-review edits update requested items/dates but do not create blocking assignments
  - confirmed-order edits continue using committed-assignment rules
  - approval creates all required committed assignments from the latest pending-review request state

Verification:

- Backend integration tests cover create, confirm-success, confirm-conflict, reject, cancel-invalid, edit, and accessory assignment in request-to-book mode.
- Confirm is transactional with availability checks and assignment creation.
- Reject does not change availability when no assignments exist.

### Step 2 Implementation Plan

1. Add order review metadata persistence:
   - Add nullable `reviewedAt`, `reviewedByUserId`, and `rejectionReason` fields to orders.
   - Add the matching Prisma migration, domain fields/getters, mapper support, and response fields where needed by admin/detail/review surfaces.
   - Keep `reviewedByUserId` as a scalar string unless a later requirement calls for a user relation.
2. Change create-order response contract:
   - Return `{ orderId: string; status: OrderStatus }` from the backend instead of a raw string.
   - Update the service/controller DTO and tests while preserving existing customer-only actor restrictions.
3. Create request-to-book orders without assignments:
   - Keep pricing, catalog, location, slot, coupon, and delivery validations unchanged.
   - For `request-to-book`, save the order, order items, bundle snapshots, pricing snapshots, and customer/order data only.
   - Do not run availability checks, resolve owner contracts, create owner splits tied to concrete assets, or save `HOLD`/`COMMITTED` assignments at submission time.
   - Preserve current instant-book behavior with availability checks and `COMMITTED` assignments.
4. Confirm pending-review orders by approving them:
   - Pass the staff reviewer user id through the confirm command.
   - Rebuild demand from the latest pending-review order items, bundle snapshots, accessories if applicable, and current order period.
   - Re-check availability and create `COMMITTED` assignments transactionally.
   - On success, set status to `CONFIRMED`, populate `reviewedAt` and `reviewedByUserId`, save owner splits for resolved assets, and emit an approval event.
   - On availability failure, return the existing order-unavailable problem response and leave the order and assignments unchanged.
5. Reject pending-review orders:
   - Add an optional `rejectionReason` request body field.
   - Pass `reviewedByUserId` and `rejectionReason` through the reject command.
   - Set status to `REJECTED`, populate review metadata, emit a rejection event, and do not release inventory for normal request-to-book orders.
6. Keep cancel invalid for pending-review orders:
   - Preserve the domain transition rule that blocks `PENDING_REVIEW -> CANCELLED`.
   - Add or keep integration coverage for the cancel endpoint returning an invalid-transition problem response.
7. Update edit lifecycle behavior:
   - For `PENDING_REVIEW`, edits should update requested dates/items/order data only and should not release, check, or create blocking assignments.
   - For `CONFIRMED`, preserve committed-assignment edit behavior.
   - Ensure later approval uses the latest edited request state.
8. Update accessory assignment lifecycle behavior:
   - Prevent concrete accessory asset assignment from creating `HOLD` assignments for pending-review orders.
   - Prefer rejecting concrete asset assignment for `PENDING_REVIEW` unless a separate non-blocking accessory request path is needed.
   - Ensure approval creates any required committed accessory assignments from the latest request state, if accessories are part of the pending request model.
9. Add approval/rejection events:
   - Add order approval and rejection events with order, tenant, customer, reviewer, and rejection reason data needed by later notification work.
   - Emit events only after successful transaction commit-equivalent service completion.
10. Test and verify:
   - Update unit/integration tests for create response shape, request-to-book creation without assignments, approval success, approval conflict rollback, rejection metadata/no inventory side effects, cancel invalid, edits, and accessory assignment behavior.
   - Run backend-focused verification from `apps/backend` before marking Step 2 complete.

## Step 3 - Tenant Settings UI

Goal: allow staff to enable request-to-book safely.

Tasks:

- [ ] Remove the disabled state from the `Request to book` option in `apps/backoffice/src/features/tenant/components/tenant-config-form.tsx`.
- [ ] Add explanatory copy:
  - instant-book confirms and reserves inventory immediately
  - request-to-book creates a pending request; inventory is not reserved until staff approves it
  - approval may fail if inventory becomes unavailable before review
- [ ] Show validation errors from the backend for invalid booking mode values.

Verification:

- Staff can switch modes and save settings.
- Reloading settings reflects saved `bookingMode`.

## Step 4 - Storefront Checkout UX

Goal: make customer-facing booking flow mode-aware.

Tasks:

- [ ] Expose a public tenant rental config endpoint or extend the existing storefront tenant config fetch to include `bookingMode`.
- [ ] Update storefront query/hooks to load booking mode alongside pricing config.
- [ ] Change cart CTA copy by mode:
  - instant-book: “Confirmar reserva” / “Reservar”
  - request-to-book: “Solicitar reserva”
- [ ] Update checkout success route to branch on created order status or tenant booking mode.
- [ ] For request-to-book success, show copy like:
  - “Tu solicitud fue enviada”
  - “El negocio revisará tu solicitud y confirmará disponibilidad”
  - “El equipo no queda reservado hasta que la solicitud sea aprobada”
  - “Te avisaremos por email cuando sea aprobada o rechazada”
- [ ] Avoid “ready for pickup”, “confirmed”, or “reserved” language until the order is approved.

Verification:

- Instant-book customer flow keeps current copy and behavior.
- Request-to-book customer flow creates the order and clearly communicates pending review with no inventory reservation yet.

## Step 5 - Staff Pending-Review Workspace

Goal: give staff a reliable queue to review booking requests.

Tasks:

- [ ] Add web API/query wrappers for `GET /orders/pending-review`.
- [ ] Add route such as `/dashboard/orders/pending-review`.
- [ ] Build a pending-review table with customer, location, created time, pickup/return window, and order number.
- [ ] Add filters for location and pagination.
- [ ] Add navigation from each row to order detail.
- [ ] Add dashboard/sidebar badge or quick link for pending-review count.
- [ ] Ensure general schedule/calendar pages continue excluding pending-review orders.
- [ ] Consider showing an “availability may have changed” indicator or quick availability check in the review queue.

Verification:

- Staff can see all pending-review requests they are authorized to view.
- Customer actors cannot access the endpoint or page.
- Pending-review requests do not appear as reserved inventory in operational surfaces.

## Step 6 - Staff Review Actions In Web

Goal: let staff approve or reject from order detail and queue surfaces.

Tasks:

- [ ] Add frontend `rejectOrder` API function and mutation hook.
- [ ] Add reject dialog with optional `rejectionReason`.
- [ ] Add approve/confirm dialog copy specific to pending-review orders.
- [ ] Make approval UI clear that approving will reserve/assign available assets at that moment.
- [ ] Remove or hide cancel action for `PENDING_REVIEW` orders; show reject instead.
- [ ] Invalidate order detail, list, pending-review queue, calendar/schedule, and availability-related queries after approve/reject.
- [ ] Handle backend conflict responses when approval fails because inventory became unavailable after the request was submitted.

Verification:

- Pending-review detail shows “Approve” and “Reject”.
- Approving moves the order to confirmed operational flow and creates committed assignments.
- If inventory is unavailable at approval time, the order remains pending review and staff sees a clear conflict message.
- Rejecting removes it from the pending-review queue without changing availability.

## Step 7 - Notifications

Goal: align emails with request-to-book lifecycle.

Tasks:

- [ ] Update customer order-created email copy to distinguish pending review from confirmed booking.
- [ ] Make request-submitted copy clear that availability is not reserved until staff approves.
- [ ] Update staff new-customer-order notification copy to flag request-to-book approvals needed.
- [ ] Add customer notification for approval/confirmation, including that the rental is now confirmed/reserved.
- [ ] Add customer notification for rejection, with optional `rejectionReason` if present.
- [ ] Add idempotency keys per lifecycle notification.

Verification:

- Request submission, approval, and rejection each send correct customer-facing messaging.
- Instant-book emails remain unchanged except for shared template cleanup.

## Step 8 - Reporting, Search, And Operational Views

Goal: make request-to-book visible without polluting operational schedules or availability.

Tasks:

- [ ] Ensure order list status filters include `PENDING_REVIEW` and `REJECTED` with clear labels.
- [ ] Add review status/count cards if useful for staff dashboard.
- [ ] Confirm calendar and schedule include only operational statuses such as `CONFIRMED` and `ACTIVE`.
- [ ] Confirm availability-sensitive reads only block on committed/operational assignments, not pending-review requests.
- [ ] Add audit/history display for `reviewedByUserId`, `reviewedAt`, and `rejectionReason`.

Verification:

- Staff can find pending, rejected, and confirmed orders.
- Pending-review requests do not affect availability and do not appear as operational pickup/return schedule events.
- Approved orders appear in operational views after committed assignments are created.

## Step 9 - End-To-End Testing

Goal: prove both modes work without regressions.

Tasks:

- [ ] Backend unit tests for tenant config defaults/validation.
- [ ] Backend integration tests for request-to-book customer create flow.
- [ ] Backend integration tests for approval-time assignment creation and conflict handling.
- [ ] Backend integration tests for rejection review metadata with no inventory side effects.
- [ ] Backend integration tests for pending-review authorization.
- [ ] Storefront tests for mode-aware CTA and success copy.
- [ ] Admin web tests for settings, pending-review queue, approve, reject, and no cancel action.
- [ ] Manual E2E script:
  1. Set tenant to request-to-book.
  2. Customer submits booking request.
  3. Verify order is pending review and inventory is not held/reserved.
  4. Verify another overlapping request or booking can still be created while the first request is pending.
  5. Staff approves the first request; verify order is confirmed, committed assignments are created, and availability is now blocked.
  6. Try approving a conflicting pending request; verify approval fails cleanly if inventory is unavailable and the request remains pending.
  7. Repeat with rejection; verify request closes and availability is unchanged.

Verification commands:

- Backend-focused changes: run app-local backend tests/lint from `apps/backend`.
- Web-focused changes: run app-local web tests/lint/check from `apps/backoffice`.
- Shared contract changes: run workspace build/lint from repository root.

## Step 10 - Future: Stale Request Cleanup

Goal: capture a possible future enhancement without making it part of the core request-to-book launch.

Notes:

- Auto-expiring or auto-deleting old pending-review requests can help keep the review queue clean.
- It is not required for the core request-to-book flow because pending-review requests do not block availability.
- If added later, decide whether stale requests should become `EXPIRED`, be soft-deleted, or simply be hidden/archived after a configured age.
- Any future cleanup should include customer/staff copy, audit history, and idempotent processing.

## Step 11 - Rollout Plan

Goal: enable request-to-book incrementally and safely.

Tasks:

- [ ] Keep default booking mode as `instant-book`.
- [ ] Deploy backend/schema changes before enabling UI selection.
- [ ] Deploy web changes with request-to-book still default-off for tenants.
- [ ] Enable request-to-book for one internal/test tenant.
- [ ] Run manual E2E script.
- [ ] Enable for pilot tenant(s).
- [ ] Document operational process for staff: review queue, approve, reject, conflict handling.

Launch checklist:

- [ ] Tenant can select request-to-book.
- [ ] Customer sees request-specific checkout copy.
- [ ] Pending-review order does not hold or block inventory.
- [ ] Staff can approve and reject.
- [ ] Approval creates committed assignments and blocks availability.
- [ ] Approval conflicts are handled clearly when inventory is unavailable.
- [ ] Notifications are correct.
- [ ] Calendar/schedule are not polluted by pending-review requests.
- [ ] Instant-book behavior is unchanged.
