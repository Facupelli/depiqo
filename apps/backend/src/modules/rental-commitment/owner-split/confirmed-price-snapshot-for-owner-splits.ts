import { ConfirmedPriceSnapshot } from '../domain/value-objects/confirmed-price-snapshot.value-object';

export interface ConfirmedPriceSnapshotForOwnerSplits {
  currency: string;
  lines: Array<{ rentalSelectionId: string; total: string }>;
}

export function getConfirmedPriceSnapshotForOwnerSplits(
  snapshot: ConfirmedPriceSnapshot | undefined,
): ConfirmedPriceSnapshotForOwnerSplits {
  if (!snapshot) throw new Error('Confirmed price snapshot is required for owner split calculation.');
  return {
    currency: snapshot.snapshot.final.currency,
    lines: snapshot.snapshot.final.lines.map(({ rentalSelectionId, total }) => ({ rentalSelectionId, total })),
  };
}
