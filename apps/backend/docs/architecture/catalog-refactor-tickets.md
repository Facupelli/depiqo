# Catalog refactor - implementation tickets

**Parent specification and source of truth:** [Catalog lifecycle and offer publication refactor](./catalog-refactor-spec.md). Each ticket is intended for a fresh coding session: read the parent spec, the affected module README(s), and local `AGENTS.md` files before changing code. This document assigns work and dependencies; it does not supersede the product rules in the spec.

**Release model:** One coordinated release. Use stacked, reviewable changes on the refactor branch. Tickets inside the schema/contract cutover milestone may temporarily leave downstream consumers uncompilable; do not merge, deploy, or declare that milestone green until its coupled tickets are complete. Do not introduce dual lifecycle models, persistent compatibility fields, temporary API aliases, or adapters solely to make a ticket independently deployable. Tests owned by a ticket should be added or updated there; workspace-wide checks run when the affected contract seam is closed.

## Dependency edges and integration milestones

- The V2 item status and offer columns are read by Catalog commands and queries, Catalog's published boundaries, Offering Management, Rental Commitment, and the Pricing rate-plan detail read. Removing them is a **single schema/domain cutover**, not a standalone migration that can be released against old code. Backfill must inspect old status and publication data **before dropping or renaming** the old fields.
- `GetRentableItemsStatusSchema` is shared by item list, detail, and rental-summary contracts. Changing it forces coordinated updates to backend projections and Backoffice Products, Inventory, and Rentals. Offer-field renaming also affects offer-edit requests, equipment-type rental usages, and rate-plan detail contracts.
- Storefront offer responses already contain `isRentable`, so the cart correction can be made independently. The New Arrivals request still uses `publishedAfter`/`PUBLISHED_AT_DESC`; that filter/sort contract, backend query, and Storefront BFF must change together later. No customer-facing publication-date response is needed.
- Pricing's rate-plan detail currently queries Catalog-owned `v2RentalOffer` directly. Move that read behind a Catalog-published display capability before renaming Catalog persistence, so the later cutover cannot perpetuate that boundary violation. This is a real prefactor, not a consumer-side copy of Catalog state.
- Offer-flag edits and archive/restore share a first-publication invariant. Establish the transaction/coordination approach in ticket 05 and use the **same approach** in ticket 06; do not independently implement incompatible timestamp writers.

**Milestones:** M0 = independent corrections (01-02); M1 = coupled schema/domain and backend behavior (03-07); M2 = coupled admin contracts and Backoffice consumers (08-11); M3 = Storefront New Arrivals contract cutover (12); M4 = final cleanup/integrated gate (13). M1 and M2 are review groupings, not deployable intermediate releases. If a partial milestone cannot pass a whole-workspace build, validate its focused seams, record the expected break, and close it promptly without compatibility scaffolding.

## Tickets

### 01 - Block non-rentable offers in the Storefront cart

- **Goal / coherent behavior:** A visible offer with `isRentable = false` remains listable but cannot be added to a customer cart. This fixes a customer-facing selection error without waiting for schema changes.
- **Scope:** `apps/storefront` cart add/quantity behavior and listing controls, starting with `modules/rental-commitment/cart/add-rental-offer/use-rental-offer-cart-state.ts`; use the existing `isRentable` storefront response. Keep the existing missing-pricing and zero-availability blocks. Check behavior when the cart already holds the offer and the latest listing says it is no longer rentable; checkout still relies on backend new-selection validation.
- **Invariants:** `showInStore`/discovery is distinct from `isRentable`/selection; no Pricing or stock rule is replaced.
- **Dependencies / validation:** Independent of all other tickets. Focused cart-hook/UI tests and Storefront test/typecheck/lint as applicable; verify a visible non-rentable card is displayed but not addable.
- **Out of scope:** Catalog schema, new API fields, changing how an already persisted rental draft confirms.

### 02 - Replace Pricing's direct Catalog persistence read

- **Goal / coherent behavior:** Rate-plan detail still shows assigned offer display facts without Pricing reading Catalog tables directly.
- **Scope:** Introduce a narrow Catalog-published read for offer display facts by ID, tenant-scoped, following the existing Catalog public-boundary conventions; use it from `pricing/features/get-rate-plan-detail` in place of direct `v2RentalOffer` access. Keep the current response semantics at this point; ticket 08 performs the final offer-field rename. Register the capability in Catalog/Pricing module composition.
- **Invariants:** Catalog owns item/offer identity, names, branch, and flags; Pricing owns assignments. Do not expose a Catalog Prisma record or implement a second Catalog store in Pricing.
- **Dependencies / validation:** Independent of 01 and the schema cutover; complete before 03. Test tenant isolation, missing referenced offers, and rate-plan-detail mapping; backend-local build, lint, and focused tests.
- **Out of scope:** Changing pricing policy, adding publication information to rate-plan detail, a generic module-wide public API.

### 03 - Cut over Catalog persistence, migration, and domain vocabulary

- **Goal / coherent behavior:** Establish the *single* authoritative archived-item/offer model on which the remaining workflows operate. This is the necessary wide refactor seam, not a releasable migration-only ticket.
- **Scope:** Prisma V2 Catalog models, one ordered migration, generated client regeneration, `RentableItem`/`RentalOffer` domain types and mappers/repositories. Add `archivedAt`, `showInStore`, `firstPublishedAt`; remove item status/activation and the old offer fields from domain and persistence. Set new offer defaults to `false/false/null`. Backfill DRAFT, ACTIVE, and ARCHIVED exactly as specified, including ACTIVE + visible + null publication -> **offer `createdAt`**. Preserve existing non-null publication dates; use migration time for legacy archived items. Adjust relevant indexes. Establish updated domain event vocabulary if still used; remove obsolete domain errors only after their consumers move.
- **Invariants:** No second persisted lifecycle or alias columns. `firstPublishedAt` is an absolute instant and write-once after backfill. Former DRAFT offers must not become discoverable as a side effect of removing status.
- **Dependencies / validation:** Blocked by 02 because Pricing currently reads Catalog Prisma directly. Validate migration against representative old-state fixtures **before old columns disappear**; unit-test new entity defaults and reconstitution. The backend may not build until tickets 04-09 replace remaining old-type consumers; do not add compatibility fields to make it build early.
- **Out of scope:** HTTP restore workflow, Offer patch transaction, customer/admin UI.

### 04 - Safe unpriced creation and atomic priced branch launch

- **Goal / coherent behavior:** Setup workflows express whether an offer is merely created or deliberately launched.
- **Scope:** Catalog offering-authoring paths and published input; Offering Management `create-equipment`, `create-package`, and `create-rental-offer-with-pricing`. Unpriced initial offerings create off/off/null offers. Priced branch-add explicitly creates on/on with first publication at creation inside its existing transaction with Pricing assignment. Preserve failure rollback. Do not make Catalog infer or validate Pricing readiness when it sets flags.
- **Invariants:** Pricing assignment later never toggles flags; a launched offer's publication date is recorded once; assignment failure leaves no launched offer. Other offer-creation callers receive safe defaults unless they explicitly launch.
- **Dependencies / validation:** Blocked by 03. Catalog offering-authoring integration tests; Offering Management create and atomicity integration specs, including rollback on pricing failure. Backend-focused validation as the cutover permits.
- **Out of scope:** Adding a launch option to unrelated UI, first publication from a subsequent offer edit, migration.

### 05 - Independent offer settings and first publication on editing

- **Goal / coherent behavior:** An admin can independently change discovery or new-selection permission without lost updates or fabricated publication dates.
- **Scope:** Catalog offer update command/handler, persistence operation, and affected domain behavior. Replace full-snapshot flag writes with writes of supplied fields only. First `false -> true` visibility change on an unarchived item assigns `firstPublishedAt` iff null; `isRentable` alone does not. Edits while archived remain permitted but do not publish. Remove the unreachable archived-offer edit rejection. Define and implement a concrete transaction/parent-item coordination strategy that ticket 06 can reuse for archive/restore. Preserve tenant scoping.
- **Invariants:** Different-flag concurrent edits both survive; same-flag edits may be last-write-wins; date never changes once set. No unguarded follow-up timestamp update based on stale state.
- **Dependencies / validation:** Blocked by 03; coordinated with 06. Backend integration tests for each flag combination, hide/re-show, archived edits, concurrent disjoint writes, and competing first publication. Test the persistence seam, not only an isolated entity method.
- **Out of scope:** Archive/restore HTTP entrypoints or storefront New Arrivals sorting.

### 06 - Archive and explicitly restore without freezing configuration

- **Goal / coherent behavior:** An item can be withdrawn from new business, configured while withdrawn, then explicitly restored without losing offer state or republishing old offers.
- **Scope:** Catalog archive operation, new restore command/controller and authorization, item-definition editing, archived offer creation/configuration, and administrative setup summary semantics. Archive stamps `archivedAt` once and is idempotent. Restore clears it; in the same coordinated transaction stamp all currently shown, never-published offers, retaining prior dates. Remove archived-item/offer guards that would forbid agreed configuration edits. An archived setup summary must not say the item is ready for new rentals but must not disable pricing edits solely for archival.
- **Invariants:** Archive masks effects without clearing flags, requirements, pricing, or dates. Visible offers edited while archived are dated on restore, not while archived. Restore can expose existing flags but does not guarantee pricing or stock.
- **Dependencies / validation:** Blocked by 03 and 05 (shared transaction strategy); ticket 07 completes discovery/selection masking. Integration tests for repeated archive/restore, edits while archived, hidden/shown offers on restore, and archive/restore racing with flag changes; authorization coverage for restore.
- **Out of scope:** Backoffice restore UI (11), historical rental rewrites.

### 07 - Apply the archive mask at new discovery and selection seams

- **Goal / coherent behavior:** Archived items cannot enter a *new* selection, while already accepted rental-draft facts remain valid.
- **Scope:** Catalog storefront discovery query, staff offer search, selection reader/resolver and published selection errors; Rental Commitment's affected error translations, create/add-selection flows, and availability as needed. Reject non-rentable offers regardless of `showInStore`; hidden but rentable offers remain directly selectable. Replace item-not-active semantics with archived-item semantics. Ensure `confirm-rental` does **not** acquire a Catalog lifecycle recheck; direct confirmed-rental creation/storefront checkout are new selections and do check.
- **Invariants:** Archive removes Storefront/staff discovery and prohibits new selection, including from a previously filled browser cart; persisted draft confirmation uses accepted snapshots. Existing confirmed rentals remain untouched.
- **Dependencies / validation:** Blocked by 03 and 06. Catalog selection integration specs; Rental Commitment create-draft/create-confirmed/add-selection and confirm-rental integration scenarios. Assert draft created before archive can confirm after archive, but new offer selection cannot.
- **Out of scope:** New Arrivals parameter naming/recency (12), arbitrary changes to rental confirmation policy.

### 08 - Cut over administrative discovery and summary reads

- **Goal / coherent behavior:** Admin listing, equipment usages, and rental product summaries report whether a product is archived without suggesting an activation lifecycle.
- **Scope:** Coupled `packages/api-contracts` and backend read changes for item list, item summaries, equipment-type rental usages, and rate-plan detail offer facts. Remove the shared `GetRentableItemsStatusSchema` and its DRAFT/ACTIVE filters; expose archival information and `showInStore`. Update Catalog list/summary and published equipment-usage reads, Offering Management's usage/count projections, and Pricing's rate-plan display mapping. Preserve unrelated rate-plan/equipment statuses. Do not add publication dates to reads that do not need them.
- **Invariants:** Archived records remain findable by admins. Unarchived does not imply launched. No old status or offer-visibility alias is added as a bridge.
- **Dependencies / validation:** Blocked by 02 and 03. Backend query/contract tests for listing, summary, usage counts, tenant scoping and Pricing display facts; shared-contract build after 09 closes the remaining detail-contract import. **Coordinated with 09-11:** removing the shared status schema can temporarily break detail contracts and Backoffice consumers; do not add a replacement compatibility schema.
- **Out of scope:** Item detail, offer-setting PATCH, restore transport (09), and Backoffice UI.

### 09 - Cut over administrative detail, offer-edit, and restore contracts

- **Goal / coherent behavior:** Product detail and the admin mutations expose independently editable offer settings and explicit restoration with no archived-item edit prohibition.
- **Scope:** Coupled `packages/api-contracts` and backend changes for item detail (including setup state), offer-setting PATCH, restore endpoint, and relevant contract exports. Replace item `status` and offer `isVisible` with archival information and `showInStore`; retire obsolete edit/error naming. Align Catalog controllers and projections with the behavior already implemented in 05-06. Preserve unrelated rate-plan statuses. No additional publication-date response is needed solely for New Arrivals.
- **Invariants:** A currently archived item cannot be described as ready for new rentals, yet its item, offer, and pricing settings remain editable. Contracts and controllers agree; no temporary alias for the old request or response.
- **Dependencies / validation:** Blocked by 05, 06, and 08. Backend detail/DTO/PATCH/restore/authorization tests, then shared-contract build. **Coordinated with 10-11:** Backoffice consumers remain a coupled integration seam until switched.
- **Out of scope:** Admin screen implementation or New Arrivals query naming.

### 10 - Update Backoffice list, inventory, and rental-summary consumers

- **Goal / coherent behavior:** Product discovery in the admin application reflects archived versus unarchived rather than draft versus active.
- **Scope:** `apps/backoffice` Products list, combo route search/filter and badges, Inventory equipment rental usages and cross-product badges, Rentals product-summary consumption, and any Pricing price-plan detail DTO consumer affected by 08. Replace draft/active filtering with all/unarchived/archived; keep archived records reachable. Consume `showInStore` in branch summaries without changing independent flag meanings.
- **Invariants:** Unarchived does not imply launched, priced, or bookable. Archived products remain visible to admins and absent from new-selection search.
- **Dependencies / validation:** Blocked by 08 and 09; can proceed in parallel with 11 after contracts are fixed. Focused route/search and presentation tests, Backoffice build/check/lint once 11 closes the remaining contract seam; verify empty states and archived navigation.
- **Out of scope:** Product detail editing, restore action, Catalog persistence.

### 11 - Update Backoffice product detail, launch, and restore workflows

- **Goal / coherent behavior:** Admins can configure a hidden/unrentable initial offer, deliberately launch it, and edit or restore archived products.
- **Scope:** `apps/backoffice/src/modules/products/` detail, branch-availability edit, pricing action, archived item edit, restore mutation/action, setup states and messages; Inventory's existing entrypoints into branch availability where relevant. Use the shared contracts and normal Backoffice authenticated transport/permissions. Make pricing-only assignment leave the flags off; show the two controls independently and explain why an unpriced/unrentable offer cannot be booked. Update Archived/READY presentation so archives are not mislabeled ready and configuration actions remain available.
- **Invariants:** No automatic flag flip from pricing edits. Restore preserves configured flags and publication history; UI does not pretend restore guarantees bookability. Do not remove archived admin edit controls merely because the item is masked from customers.
- **Dependencies / validation:** Blocked by 06 and 09; parallel with 10. Focused mutation/query invalidation and UI tests, then Backoffice check/build/test/lint with 10; manual admin creation -> price -> launch -> archive -> edit -> restore verification.
- **Out of scope:** Storefront cart/checkout changes and new pricing policy.

### 12 - First-publication recency and New Arrivals contract cutover

- **Goal / coherent behavior:** New Arrivals uses immutable first-publication recency, not creation or most recent visibility edit.
- **Scope:** Catalog storefront rental-offer filtering/sorting on `firstPublishedAt`; coordinated shared `get-storefront-rental-offers` query contract and Storefront BFF `new-arrivals` call/transport naming. Replace old `publishedAfter` / `PUBLISHED_AT_DESC` vocabulary with final first-publication names; retain existing page/window behavior and existing item-kind constraints. Storefront offer listing remains based on `showInStore` and unarchived item, not price or `isRentable`.
- **Invariants:** Never-published offers do not enter a recent-publication filter; hide/re-show does not bump old offers; priced branch-add and first launch can appear when in window. An unpriced or non-rentable shown offer may list but cart remains blocked as appropriate.
- **Dependencies / validation:** Blocked by 03, 05, 07 and 01. May run in parallel with 10-11 after backend schema is stable; contract/backend/Storefront request naming switches together. Backend list/filter/order integration tests and Storefront BFF/listing tests, plus focused tests/builds for these workspaces.
- **Out of scope:** A new customer-facing publication-date field or a new definition of availability.

### 13 - Remove legacy surface and pass the integrated release gate

- **Goal / coherent behavior:** The branch has one Catalog lifecycle and one publication model, with end-to-end proof rather than a collection of locally passing slices.
- **Scope:** Remove leftover Catalog status/activation types, archived-offer error, stale field names, dead tests and obsolete query/filter UI from all affected workspaces; update Catalog/Offering Management/Pricing/Rental Commitment and Products documentation only where durable domain knowledge changed. Audit schema, migrations, package exports, backend/public error mappings, Backoffice, and Storefront for unintended old references; distinguish unrelated `ACTIVE` statuses and legacy *non-Catalog* tables. Run migration on legacy-state fixtures, all affected integration/authorization tests and app-local validation. Verify real create -> price -> launch -> storefront/cart -> archive -> confirm existing draft -> restore -> New Arrivals behavior and scrutinize UI states.
- **Invariants:** No compatibility fields, dual reads/writes, or permanent adapter retained. Final affected branch is green before coordinated release.
- **Dependencies / validation:** Blocked by 01-12, especially closure of the shared contract/consumer milestone (08-11). Use `@repo/api-contracts` build; backend build/lint/focused unit and integration/e2e; Backoffice build/check/lint/test; Storefront typecheck/lint/check/test/build, adjusted to actual affected surfaces. Follow local `AGENTS.md`; avoid root-wide validation by default.
- **Out of scope:** Deploying partial stages, unrelated platform refactors, changing the agreed product rules.

## Breakdown challenge / fresh-session handoff

- **Not merely horizontal layers:** 01, 04-07, and 10-12 deliver distinct cart, setup, offer-edit, archive, selection, admin, and recency behaviors. 02 is necessary architectural prefactoring. 03 is deliberately a horizontal *integration seam*: splitting the migration from the model would either invalidate the backfill or force a forbidden parallel lifecycle. 08-09 are coupled admin contract seams, not proposed standalone deployments.
- **Tight coupling acknowledged:** 05 and 06 share publication concurrency; implement their transaction approach consistently. 08-11 share admin contracts; review them as one coherent cutover, not independent releases. 12 changes its contract and both consumers in one ticket.
- **No compatibility pressure:** Intermediate compile errors across milestone boundaries are tracked, not patched with aliases. A fresh session should read this ticket, the linked spec, current source and failing seams, and know which subsequent ticket closes them. Do not call a milestone complete while its contract consumers remain broken.
- **Migration and tests:** 03 owns old-status backfill ordering and its data fixtures; 04-07 own behavior and concurrency tests; 12 owns recency; 13 owns integrated verification.
- **Scope guard:** Do not expand the Pricing cleanup beyond its current direct Catalog persistence dependency or introduce a broad cross-module abstraction. No new lifecycle or pricing-readiness state is needed.

## Recommended order / graph

```text
01 Storefront cart fix ───────────────────────────────────────────────┐
02 Pricing -> Catalog published read ──> 03 Schema + domain cutover   │
                                      ├──> 04 Creation/launch         │
                                      ├──> 05 Offer edit/publication  │
                                      │      └──> 06 Archive/restore  │
                                      │              └──> 07 Selection│
                                      └──────────────> 08 Admin discovery + contracts
                                                           └──> 09 Detail/edit/restore contracts
                                                                  ├──> 10 Admin list/inventory/rentals
                                                                  └──> 11 Admin detail/restore
03 + 05 + 07 + 01 ───────────────────────────> 12 New Arrivals contract + BFF
01-12 ───────────────────────────────────────> 13 Cleanup + integrated gate
```

**Parallel options:** 01 and 02 can begin independently. After 03, creation (04) and offer-edit design (05) can advance separately; 06 depends on 05, while 07 must see 06's archive semantics. 10 and 11 can run in parallel after 09; 12 can overlap with those Backoffice tickets. Treat any overlap touching the same shared contract or test fixture as an explicit coordination point rather than inventing a compatibility layer.
