import { ConfirmedPriceSnapshot } from '../domain/value-objects/confirmed-price-snapshot.value-object';

export interface ConfirmedPriceSnapshotForOwnerSplits {
  currency: string;
  lines: Array<{ rentalSelectionId: string; total: string }>;
}

export function getConfirmedPriceSnapshotForOwnerSplits(
  snapshot: ConfirmedPriceSnapshot | undefined,
): ConfirmedPriceSnapshotForOwnerSplits {
  const value = snapshot?.toJSON();
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('final' in value) ||
    !value.final ||
    typeof value.final !== 'object' ||
    Array.isArray(value.final) ||
    typeof value.final.currency !== 'string' ||
    !Array.isArray(value.final.lines)
  ) {
    throw new Error('Confirmed price snapshot is invalid for owner split calculation.');
  }

  const lines = value.final.lines.map((line) => {
    if (
      !line ||
      typeof line !== 'object' ||
      Array.isArray(line) ||
      typeof line.rentalSelectionId !== 'string' ||
      typeof line.total !== 'string'
    ) {
      throw new Error('Confirmed price snapshot contains an invalid owner split price line.');
    }

    return { rentalSelectionId: line.rentalSelectionId, total: line.total };
  });

  return { currency: value.final.currency, lines };
}
