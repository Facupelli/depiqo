import { ConfirmedPriceSnapshot } from '../domain/value-objects/confirmed-price-snapshot.value-object';

export interface ConfirmedPriceSnapshotForOwnerSplits {
  calculated: {
    currency: string;
    lines: Array<{ rentalSelectionId: string; total: string }>;
  };
}

export function getConfirmedPriceSnapshotForOwnerSplits(
  snapshot: ConfirmedPriceSnapshot | undefined,
): ConfirmedPriceSnapshotForOwnerSplits {
  const value = snapshot?.toJSON();
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('calculated' in value) ||
    !value.calculated ||
    typeof value.calculated !== 'object' ||
    Array.isArray(value.calculated) ||
    typeof value.calculated.currency !== 'string' ||
    !Array.isArray(value.calculated.lines)
  ) {
    throw new Error('Confirmed price snapshot is invalid for owner split calculation.');
  }

  const lines = value.calculated.lines.map((line) => {
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

  return { calculated: { currency: value.calculated.currency, lines } };
}
