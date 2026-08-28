# 0001. Rental Asset Reservation Concurrency Strategy

## Status

Accepted

## Date

2026-08-28

## Context

Rental confirmation must prevent overlapping reservations for the same physical asset while keeping persistence transactions short.

Availability is planned before the persistence transaction. Concurrent confirmations can therefore select the same asset and legitimately race during persistence. These conflicts are part of the concurrency model and are not necessarily application defects.

The `v2_asset_blocks` table has a PostgreSQL exclusion constraint that directly expresses the double-booking invariant.

## Decision

Rental confirmation uses **optimistic allocation with database enforcement**.

Availability is planned before the persistence transaction. The transaction itself is intentionally kept short, and the PostgreSQL exclusion constraint on `v2_asset_blocks` is the final authority that prevents overlapping reservations for the same asset.

Application-level availability checks do not replace this database invariant. The `v2_asset_blocks` exclusion constraint must remain authoritative even if application-level locking is introduced later.

The following behavior is part of this decision:

```text
Availability planning is optimistic.

The v2_asset_blocks exclusion constraint is the authoritative
double-booking protection.

23P01
→ reservation conflict
→ insufficient_asset_availability

40P01 during the known block-insertion race
→ retry the complete atomic persistence transaction once

Second 40P01
→ propagate
```

A `23P01` exclusion-constraint violation means another transaction reserved an asset first. The confirmation therefore no longer has sufficient asset availability and is reported as `insufficient_asset_availability`.

A `40P01` deadlock does not imply that the asset is unavailable. PostgreSQL chose one transaction as the deadlock victim, so the complete atomic persistence transaction is retried once. Retrying only the failed SQL statement would be incorrect because the transaction has already been aborted. If the retried transaction encounters another `40P01`, the error remains visible rather than being retried indefinitely.

## Consequences

Persistence transactions remain short, and no additional coordination mechanism is required for the normal confirmation path.

Concurrent confirmations may fail with `insufficient_asset_availability` even when their earlier availability planning succeeded. Callers and tests must treat this as an expected reservation outcome.

The known block-insertion deadlock race receives one bounded retry of the complete atomic persistence transaction. Repeated deadlocks remain visible for diagnosis instead of being retried indefinitely.

This decision should be reconsidered if production shows frequent reservation contention, repeated deadlocks after the bounded retry, or systematic lock-order problems when confirming rentals involving multiple assets.

## Alternatives Considered

### Alternative: Pessimistic locking

Locking candidate asset rows and revalidating availability while holding those locks would coordinate confirmations before block insertion. It was not chosen because the exclusion constraint already enforces the actual invariant, while pessimistic locking would introduce longer transactions and additional lock-order complexity.

If stronger coordination becomes necessary, this is the next strategy to evaluate. Relevant rows must be locked in deterministic order, availability must be revalidated while holding those locks, and only then may the reservation be persisted.

### Alternative: Advisory locks

Advisory locks could serialize confirmations by asset. They were not chosen because they duplicate coordination outside the database constraint, require a reliable lock-key scheme and deterministic acquisition order, and add failure modes without replacing the exclusion constraint.

### Alternative: Serializable transactions

Serializable isolation could detect conflicting transaction schedules. It was not chosen because it broadens concurrency coordination beyond the specific double-booking invariant and introduces serialization failures and retry requirements where the exclusion constraint already provides targeted enforcement.

### Alternative: Optimistic allocation with database enforcement

This strategy was chosen because the exclusion constraint directly expresses the invariant, keeps transactions short, and limits retries to the known deadlock race.

## Implementation Notes

The `23P01` mapping must convert exclusion-constraint conflicts into `rental_commitment.insufficient_asset_availability`.

A `40P01` encountered during the known block-insertion race must retry the complete atomic persistence transaction exactly once. The retry must not target only the failed SQL statement. A second `40P01` must propagate.

The database exclusion constraint must not be removed or weakened in favor of application-level availability checks or future locking.

## Related Documents

- [`../overview.md`](../overview.md)
- [`../../../src/modules/rental-commitment/README.md`](../../../src/modules/rental-commitment/README.md)
- [`../../../src/core/utils/postgres-error.mapper.ts`](../../../src/core/utils/postgres-error.mapper.ts)
- [`../../../src/modules/rental-commitment/asset-allocation/rental-asset-allocation.service.ts`](../../../src/modules/rental-commitment/asset-allocation/rental-asset-allocation.service.ts)
- [`../../../src/modules/rental-commitment/persistence/prisma-rental.repository.ts`](../../../src/modules/rental-commitment/persistence/prisma-rental.repository.ts)
