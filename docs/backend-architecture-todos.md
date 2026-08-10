# Backend Architecture TODOs

## Data integrity and concurrency

- [x] Add or explicitly justify the missing database FK for `V2TenantUser.tenantId`.
  - Current fixtures must verify tenant existence because the database does not enforce the relationship.
  - Audit existing data before introducing the constraint, or document the intentional architectural reason for its absence.

- [x] Serialize concurrent confirmation of the same rental.
  - Added a monotonic numeric `V2Rental.version` concurrency token.
  - Guarded Rental Commitment lifecycle writes now use `WHERE version = N` with an atomic database increment.
  - Confirmation, cancellation, editing, replacement, accessory assignment, and draft customer assignment no longer use `updatedAt` as a concurrency token.
  - Concurrent commands based on the same rental version allow exactly one persistence attempt to succeed; the loser returns `rental_commitment.rental_version_conflict`.
  - Cross-rental asset exclusivity continues to be enforced by the PostgreSQL active `AssetBlock` exclusion constraint.

- [ ] Make final asset eligibility authoritative before creating a commitment.
  - Confirmation, direct confirmed creation, editing, and replacement still rely on `V2RentalAssetCandidate`, whose stale projection could permit an asset or equipment type that Asset Inventory no longer considers eligible.
  - Add synchronous authoritative validation or a provable freshness mechanism.

- [ ] Protect asset replacement against concurrent contract finalization.
  - Replacement checks contract state before entering the rental transaction.
  - A contract can become `GENERATED`, `SIGNING_REQUESTED`, or `SIGNED` after that check but before replacement commits.

- [x] Make the Rental concurrency token strictly monotonic.
  - Replaced `updatedAt` with the numeric `V2Rental.version` token.
  - Guarded writes compare `version = N` and atomically increment it in the database.
  - `updatedAt` remains audit metadata only.

## Rental and contract lifecycle

- [ ] Emit `RentalConfirmedIntegrationEvent` from normal DRAFT/PENDING confirmation.
  - Direct confirmed creation emits it, but `Rental.confirm()` currently does not record the corresponding integration event.

- [ ] Define cancellation and Contracts orchestration.
  - Cancellation currently does not inspect or transition generated, signing, or signed contracts.
  - Establish the product rule for existing contracts when their rental is cancelled.

- [ ] Define event semantics for confirmed-rental asset replacement.
  - Replacing an assigned physical asset currently emits neither a replacement-specific event nor `ConfirmedRentalEditedIntegrationEvent`.

- [ ] Add durable integration-event delivery / outbox semantics.
  - Events are collected transactionally but published in-process after commit.
  - Publication failure is logged and swallowed, allowing committed state without guaranteed event delivery.

## Pricing and confirmed snapshots

- [x] Calculate owner splits from the accepted confirmed price.
  - Owner split calculation now uses the accepted `confirmedPriceSnapshot.final` currency and lines through the owner-split pricing helper.
  - Manual target-total adjustments now produce owner amounts from the accepted final line totals.

- [ ] Normalize confirmed price-snapshot context semantics.
  - Direct confirmed creation produces `context: CONFIRMED`, while draft-to-confirmation may preserve `context: DRAFT`.
  - Define whether context means when pricing was calculated or which lifecycle owns the accepted snapshot.

- [x] Clarify `manualPricingAdjustment: null` semantics on confirmed edits.
  - `null` applies no manual adjustment when an operational edit recalculates pricing.
  - Details-only edits do not recalculate pricing and preserve the accepted snapshot, including any existing adjustment.

## Historical and audit persistence

- [ ] Decide whether released `AssetBlock` history must survive operational edits.
  - Confirmed-rental edits and replacements may delete historical released-block rows while rebuilding current state.
  - Decide whether these rows are immutable audit facts.

- [ ] Preserve creation semantics of unchanged rental child rows.
  - Aggregate saves delete and recreate unchanged `RentalSelection`, `RentalDemandLine`, and `AssignedAsset` rows.
  - Preserve IDs and business values without changing `createdAt` when rows are unchanged.

## Tenant and identity integrity

- [x] Clarify the local-account authentication invariant.
  - `V2TenantUser` is the application account, and `V2LocalCredential` is its email/password authentication capability.
  - Tenant-user `V2AuthIdentity` persistence was removed because it was not authentication authority.

## Date and time model

- [x] Formalize backend timestamp semantics.
  - Active V2 absolute instants use `TIMESTAMPTZ`, while timezone-independent calendar values use `DATE` and local clock times use minutes from midnight.
  - The canonical [temporal semantics](../apps/backend/docs/architecture/temporal-semantics.md) guide documents API, Prisma, timezone, DST, range, and PostgreSQL session rules.

- [x] Fix branch schedule-slot timezone and DST handling.
  - Schedule slots resolve `LocalDate + minuteOfDay` through the branch's effective IANA timezone.
  - Nonexistent spring-forward local times are omitted; ambiguous fall-back times resolve to the earlier occurrence.
  - Clients submit the server-provided slot instant rather than constructing one from elapsed minutes after midnight.

## API consistency and cleanup

- [x] Clarify duplicate Rental Offer selection error semantics.
  - Repeated `rentalOfferId` values are a semantic payload error exposed by every Rental Commitment create/edit flow as `rental_commitment.duplicate_rental_offer_selection` (`422`).
  - Catalog validates the duplicate through its Catalog-owned public selection-resolution error, which Rental Commitment translates at its boundary.

- [ ] Review response-envelope consistency.
  - Some feature contracts containing `data` are wrapped by the global envelope, producing responses such as `{ "data": { "data": [...] } }`.
  - Decide whether nested envelopes are intentional API design.

- [x] Reconcile create-draft schedule validation semantics.
  - Draft rentals are intentionally schedule-flexible. Pickup and return branch schedules are validated when creating a confirmed rental, not when creating a draft.
  - Removed unreachable create-draft schedule error mappings.

## Known infrastructure constraints

- [x] Document the Prisma / `pg` interactive-transaction compatibility issue.
  - Current stack: Prisma `7.8.0`, `@prisma/adapter-pg` `7.8.0`, and `pg` `8.20.0`.
  - Known trigger: a Prisma relation `include` with multiple child relations executed through an interactive transaction client. This was reproduced in `PrismaRentalRepository.findById(..., tx)`.
  - Observed behavior: Prisma issues sibling relation reads against the same transaction-bound `pg.Client`. `pg` logs: `Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0`.
  - With `pg` `8.20.0`, the queries are still queued and execute successfully. Current integration and E2E behavior remains correct.
  - Verified locally:
    - `replace-confirmed-rental-asset.integration-spec.ts`: 31/31 passes with the current implementation.
    - Loading the same relations explicitly and sequentially removes the warning while preserving 31/31 behavior.
    - No application-level concurrent `tx` calls or `Promise.all()` caused the warning.
  - Current decision: keep production code unchanged, accept the warning while remaining on the current Prisma / `pg` versions, and do not introduce a repository workaround only to suppress it.
  - Revisit this issue before upgrading to `pg` 9. Prefer, in order:
    1. an upstream Prisma fix;
    2. a supported Prisma relation-loading solution;
    3. the proven sequential relation-load workaround.
  - Do not weaken transaction or concurrency semantics to work around this issue.

## External infrastructure boundaries

- [ ] Put the custom-hostname provider behind an application port.
- [ ] Put Google identity verification/exchange behind an application port.
- [ ] Ensure E2E composition replaces every network-capable external provider with a safe fake:
  - Resend
  - R2/object storage
  - Cloudflare
  - Google OAuth

## Testing architecture

- [ ] Review integration-test application composition.
  - Some slice-level integration tests boot the full `AppModule`, bringing unrelated modules such as Contracts/PDF rendering into tests.
  - Evaluate narrower composition while retaining real PostgreSQL and required internal dependencies.
