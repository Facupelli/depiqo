import { randomUUID } from 'crypto';

export type RentalSelectionId = string & { readonly __brand: 'RentalSelectionId' };

export const RentalSelectionId = {
  create(): RentalSelectionId {
    // SAFETY: randomUUID() always returns a non-empty UUID string, which satisfies this opaque identifier brand.
    return randomUUID() as RentalSelectionId;
  },

  from(value: string): RentalSelectionId {
    if (!value) {
      throw new Error('RentalSelectionId cannot be empty');
    }

    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    return value as RentalSelectionId;
  },
};
