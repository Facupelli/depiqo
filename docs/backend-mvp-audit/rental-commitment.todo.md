# Rental Commitment MVP TODO

## Existing capabilities

Staff can create drafts, assign a customer, confirm, cancel, list/detail/calendar rentals, and query availability. Customer-facing confirmed creation exists. Confirmation expands catalog selections into distinct demand lines, prices and snapshots the rental, allocates assets, creates blocks, and snapshots owner splits. Accessories can be replaced as a set with assignments/blocks. Storefront offer availability is public.

## Missing or incomplete capabilities

### [ ] Persist customer-created pending rental requests

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** A customer submits a request for staff review.
- **Current evidence:** `create-pending-rental.service.ts` validates tenant/branch/customer but returns `{ rentalId: '' }`; it does not resolve offers, price, create a `Rental`, persist it, or emit the customer-created event consumed by Notifications.
- **Gap:** The request workflow is a stub and cannot produce an operable pending rental.
- **Expected behavior:** Resolve and snapshot selections/demand, proposed price and customer/booking facts, persist a PENDING rental, and emit one post-commit event.
- **Lifecycle rules:** Pending rentals do not block assets and may be corrected, confirmed, or cancelled.
- **Owning module:** Rental Commitment
- **Dependencies:** Catalog, Pricing, Tenant Management, Notifications.
- **Side effects:** Rental-created event and staff notification; no asset blocks.
- **Acceptance criteria:** Submission returns a real ID visible in backoffice and can proceed to confirmation or cancellation.
- **Suggested tests:** Storefront-to-backoffice E2E, invalid offer/price tests, retry/idempotency, and notification event test.

### [ ] Edit unconfirmed rental dates, branch, fulfillment, selections, and quantities

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff corrects a draft/pending quote before confirmation.
- **Current evidence:** The aggregate only mutates customer, confirm, and cancel; no selection, period, branch, delivery, notes, insurance, or quantity update command exists. `PrismaRentalRepository.save` replaces child rows, so replacement ordering must also remain valid for existing dependent rows.
- **Gap:** Draft/pending rentals are effectively immutable after creation except customer assignment.
- **Decomposition decision:** This is one staff-facing `EditUnconfirmedRental` command, not independent date, branch, fulfillment, or selection commands. Every listed field changes the same proposed commercial commitment: branch/schedule validation, catalog snapshots, derived demand, and price must be calculated from one candidate state and committed together. The existing rental-detail query supplies edit data, and draft-price calculation can remain a non-persistent preview; neither needs a new use case for the MVP.
- **Expected behavior:** Atomically replace affected commercial selections and derived demand lines, revalidate branch/schedules/catalog, and reprice while preserving selection-demand traceability.
- **Lifecycle rules:** Allowed for DRAFT/PENDING; no blocks exist; manual price adjustments require authorized staff and audit identity.
- **Owning module:** Rental Commitment
- **Dependencies:** Tenant Management, Catalog, Pricing.
- **Side effects:** Replace proposed price snapshot and demand; notify customer only where workflow requires.
- **Subtasks:**
  - [ ] **Define and enforce staff manual-price-adjustment authorization.** Make the permission decision explicit and apply it to both draft creation and unconfirmed-rental editing. Preserve the acting tenant-user ID, adjustment reason, amount/mode, and timestamp in the proposed-price snapshot or an audit record. Do not accept an adjustment merely because the caller is authenticated.
  - [x] **Implement `EditUnconfirmedRental`.** Add one tenant-user-protected HTTP command and API contract that replaces the editable candidate state - period, branch, fulfillment method and delivery details, selected offers and quantities, notes, insurance selection, and optional authorized manual adjustment. Load the aggregate through `RentalRepository`; reject every status other than DRAFT/PENDING; resolve fresh catalog snapshots, regenerate selection IDs and demand lines with their links, validate the candidate against Tenant Management, reprice through Pricing, mutate through an aggregate method, and save the entire replacement atomically. It must neither assign nor block assets, nor change customer/source/confirmed facts.
  - [ ] **Make replacement persistence safe and verify the use case.** Ensure the transactional graph replacement deletes dependent rows in foreign-key-safe order and cannot leave stale selection, demand, delivery, accessory-reference, assignment, or block data. Current limitation: accessory-only mutations do not advance `v2_rentals.updated_at`, so the edit command's optimistic version check and operational-commitment pre-check cannot prevent a concurrent accessory assignment from racing this replacement. Resolve that race as part of this subtask. Add aggregate status/invariant tests; repository transaction tests for replacement and rollback; and staff E2E coverage for add/change/remove package selections, quantities, dates, branch, pickup-to-delivery and delivery-to-pickup transitions, invalid/empty selections, invalid schedules/catalog/pricing, unauthorized manual adjustments, and no asset blocks.
- **Acceptance criteria:** Add/change/remove selections and dates produces correct demand and price and rejects invalid/empty results.
- **Suggested tests:** Aggregate tests, transactional repository tests, and E2E edits covering package quantities and delivery changes.

### [ ] Modify confirmed rentals with coordinated revalidation

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Before fulfillment, staff changes dates, branch, customer, selections, quantities, delivery, or price by an allowed correction.
- **Current evidence:** No confirmed-edit command/event exists despite the module README describing it; confirmed aggregate facts have no mutators.
- **Gap:** Operational corrections cannot update availability, pricing, blocks, assignments, owner splits, contracts, and notifications consistently.
- **Expected behavior:** Define field-level policy, preserve prior accepted facts/audit, recalculate all affected state atomically, and emit a confirmed-rental-edited event.
- **Lifecycle rules:** Allowed only before pickup/delivery and under explicit signed-contract policy; historical versions are retained where legally relevant.
- **Owning module:** Rental Commitment
- **Dependencies:** Catalog, Pricing, Asset Inventory, Contracts, Notifications.
- **Side effects:** Reassign/reblock, new accepted snapshot, owner splits, `RESIGN_REQUIRED`/regeneration, customer notification.
- **Acceptance criteria:** Each supported edit either commits every consequence together or changes nothing.
- **Suggested tests:** E2E date/item/customer/branch edits with conflict rollback, signed contract, and notification assertions.

### [ ] Replace or unassign equipment assets safely

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** A prepared asset fails inspection and staff substitutes another unit.
- **Current evidence:** Assets are auto-assigned only during confirmation; no assignment command exists after confirmation. `PrismaRentalRepository.save` rewrites all assignments/blocks.
- **Gap:** Assignments cannot be corrected, manually selected, or released without cancelling the rental.
- **Expected behavior:** Replace/unassign/reassign against demand compatibility and current eligibility, releasing and creating blocks atomically and refreshing owner splits.
- **Lifecycle rules:** Required demand must remain complete in CONFIRMED/PREPARED; post-handover replacement requires a separately defined exceptional transition.
- **Owning module:** Rental Commitment
- **Dependencies:** Asset Inventory eligibility/current ownership.
- **Side effects:** Equipment blocks, assignment history, owner splits, contract re-sign state where asset identity is legal content.
- **Acceptance criteria:** Replacement cannot double-book, lose a block, or leave demand partially fulfilled.
- **Suggested tests:** Concurrency integration tests and E2E replacement with third-party ownership and contract consequences.

### [ ] Prevent concurrent double booking at the database boundary

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Two staff members confirm overlapping rentals for the last available asset.
- **Current evidence:** `confirm-rental.handler.ts` explicitly notes a race between allocation planning and block insertion; `asset-blocks.prisma` notes the missing PostgreSQL exclusion constraint.
- **Gap:** Application-level availability checks do not prevent concurrent overlapping active blocks.
- **Expected behavior:** Serialize allocation or enforce a PostgreSQL exclusion/locking invariant and map conflicts to a stable availability error.
- **Lifecycle rules:** Released blocks do not conflict; equipment and accessory allocations both obey the invariant.
- **Owning module:** Rental Commitment
- **Dependencies:** Database migration and transaction design.
- **Side effects:** None beyond atomic block persistence.
- **Acceptance criteria:** Parallel overlapping confirmations/assignments yield at most one success and no duplicate active commitment.
- **Suggested tests:** Real-PostgreSQL concurrent confirmation and accessory allocation integration tests.

### [ ] Represent preparation and readiness

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** Staff reviews assignments/accessories and marks the rental ready for handover.
- **Current evidence:** `PREPARED` exists in schema/domain documentation, but there is no prepare command; accessory assignment allows only PENDING and CONFIRMED, an unusual set that excludes PREPARED.
- **Gap:** No preparation state transition, readiness criteria, preparer audit, or reopening/correction rule exists.
- **Expected behavior:** Mark confirmed rentals prepared only after required assignments and preparation decisions are complete; permit explicit reopen before handover.
- **Lifecycle rules:** CONFIRMED to PREPARED; PREPARED to CONFIRMED only by authorized correction; no preparation for pending/cancelled/completed rentals.
- **Owning module:** Rental Commitment
- **Dependencies:** Asset/accessory assignment capabilities.
- **Side effects:** Preparation event, optional contract generation and ready notification.
- **Acceptance criteria:** Backoffice can distinguish confirmed-unprepared from ready and cannot prepare incomplete rentals.
- **Suggested tests:** State-machine unit tests and E2E prepare/reopen with accessories.

### [ ] Add pickup/delivery, return, partial return, condition, and completion transitions

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff hands over equipment, records staggered/damaged returns, and closes the rental.
- **Current evidence:** `V2RentalStatus` contains only PENDING, DRAFT, CONFIRMED, PREPARED, CANCELLED, COMPLETED; no handover/return feature or per-assignment return state exists.
- **Gap:** The fundamental fulfillment half of the rental lifecycle is absent and rentals cannot reach COMPLETED through an application capability.
- **Expected behavior:** Record handover, per-asset return time/condition, partial outstanding assets, and final completion while preserving evidence.
- **Lifecycle rules:** Handover requires ready/confirmed policy; only handed-over assets return; completion requires all required assets resolved.
- **Owning module:** Rental Commitment
- **Dependencies:** Asset Inventory receives current condition/location changes through its own capability; Notifications and Contracts consume events.
- **Side effects:** Adjust/release blocks at the correct business point, emit handover/return/completion events, update asset condition through Inventory API.
- **Acceptance criteria:** Full and partial return flows are queryable, damaged return is recorded, and completion cannot occur with outstanding assets.
- **Suggested tests:** Full lifecycle E2E, partial/damaged return, duplicate scan idempotency, and transaction failure rollback.

### [ ] Correct accessory lifecycle and state policy

- **Priority:** P0
- **Status:** Inconsistent
- **MVP scenario:** Staff adds, removes, or replaces accessories during preparation without allowing pending requests to reserve stock.
- **Current evidence:** `assign-rental-accessories.handler.ts` allows PENDING and CONFIRMED, immediately allocates and blocks assets, and excludes PREPARED; documentation says pending rentals do not block assets and accessories are preparation decisions.
- **Gap:** Current behavior violates rental blocking rules and lacks prepared/reopen/handover policy.
- **Expected behavior:** Suggestions/selections for unconfirmed requests do not block; operational assignment/blocking occurs in allowed confirmed preparation states; removals release blocks atomically.
- **Lifecycle rules:** Define selection versus physical assignment separately; forbid mutation after handover except explicit replacement flow.
- **Owning module:** Rental Commitment
- **Dependencies:** Asset Inventory defaults/current facts.
- **Side effects:** Accessory blocks, assignments, readiness, contracts where accessories are listed.
- **Acceptance criteria:** Pending accessory choices create no active block and confirmed changes cannot race or leave stale blocks.
- **Suggested tests:** Status matrix and concurrent add/remove/replace E2E tests.

### [ ] Emit confirmation events for draft/pending confirmation

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** A staff-confirmed draft triggers customer confirmation and downstream contract workflows.
- **Current evidence:** `Rental.createConfirmed` records `RentalConfirmedEvent`, but `Rental.confirm()` does not; `ConfirmRentalHandler` collects events after calling `confirm()`. Notifications listens for this event.
- **Gap:** The ordinary draft/pending confirmation path commits successfully without publishing confirmation side effects.
- **Expected behavior:** The aggregate records one confirmation event on every successful transition and publishes it only after commit.
- **Lifecycle rules:** Retries/idempotent calls must not duplicate customer communications.
- **Owning module:** Rental Commitment
- **Dependencies:** Domain event publisher, Notifications, future Contracts consumer.
- **Side effects:** Confirmation notifications and any contract preparation trigger.
- **Acceptance criteria:** Every successful first confirmation emits exactly one event; failed/duplicate attempts emit none.
- **Suggested tests:** Aggregate event test and E2E draft-confirm notification test.

### [ ] Expose customer rental history and detail

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** A signed-in customer views requests, confirmed bookings, contract status, and past rentals.
- **Current evidence:** Rental list/detail controllers require `TenantUserSessionGuard`; storefront exposes branches and availability but no customer-owned rental queries.
- **Gap:** Customers cannot retrieve the commitments they created or their current status.
- **Expected behavior:** Customer-scoped list/detail returns only the authenticated customer's rentals and safe snapshots, with contract links obtained through Contracts.
- **Lifecycle rules:** Cancelled/completed rentals remain visible; internal notes, owner splits, and staff-only data are excluded.
- **Owning module:** Rental Commitment
- **Dependencies:** Contracts customer-safe signing summary.
- **Side effects:** None.
- **Acceptance criteria:** A customer sees only their own tenant rentals with pagination and status/history.
- **Suggested tests:** E2E tenant/customer isolation, safe response shape, pagination, and cancelled/completed visibility.
