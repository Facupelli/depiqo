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

- [ ] Clarify `manualPricingAdjustment: null` semantics on confirmed edits.
  - Details-only edits with `null` preserve the existing adjustment, while operational edits with `null` reprice without it.
  - Decide whether `null` consistently means leave unchanged or no adjustment.

## Historical and audit persistence

- [ ] Decide whether released `AssetBlock` history must survive operational edits.
  - Confirmed-rental edits and replacements may delete historical released-block rows while rebuilding current state.
  - Decide whether these rows are immutable audit facts.

- [ ] Preserve creation semantics of unchanged rental child rows.
  - Aggregate saves delete and recreate unchanged `RentalSelection`, `RentalDemandLine`, and `AssignedAsset` rows.
  - Preserve IDs and business values without changing `createdAt` when rows are unchanged.

## Tenant and identity integrity

- [ ] Clarify the `V2AuthIdentity` invariant for local accounts.
  - Registration creates a `V2AuthIdentity`, but local authentication apparently does not require it.
  - Define what this entity represents and when it must exist, including the model/database invariant.

## Date and time model

- [x] Formalize backend timestamp semantics.
  - Active V2 absolute instants use `TIMESTAMPTZ`, while timezone-independent calendar values use `DATE` and local clock times use minutes from midnight.
  - The canonical [temporal semantics](../apps/backend/docs/architecture/temporal-semantics.md) guide documents API, Prisma, timezone, DST, range, and PostgreSQL session rules.

- [ ] Fix branch schedule-slot timezone and DST handling.
  - Slot construction risks interpreting dates at UTC midnight instead of applying the branch's IANA timezone and DST rules.
  - Cover non-UTC branches and timezone boundaries.

## API consistency and cleanup

- [ ] Clarify duplicate Rental Offer selection error semantics.
  - Create-draft detects Catalog duplicates as generic invalid input (`422`), while Rental Commitment has a dedicated duplicate-selection `409` mapping that is unreachable.
  - Choose one stable contract and remove the dead alternative.

- [ ] Review response-envelope consistency.
  - Some feature contracts containing `data` are wrapped by the global envelope, producing responses such as `{ "data": { "data": [...] } }`.
  - Decide whether nested envelopes are intentional API design.

- [ ] Remove or reconcile unreachable create-draft schedule error mappings.
  - The draft controller maps pickup/return schedule errors, but `validateDraftRental()` does not perform schedule validation.
  - If drafts are intentionally schedule-flexible, remove or document the dead mappings.

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
