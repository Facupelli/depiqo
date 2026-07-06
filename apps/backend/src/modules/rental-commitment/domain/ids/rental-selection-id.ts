import { randomUUID } from 'crypto';

export type RentalSelectionId = string & { readonly __brand: 'RentalSelectionId' };

export const RentalSelectionId = {
  create(): RentalSelectionId {
    return randomUUID() as RentalSelectionId;
  },

  from(value: string): RentalSelectionId {
    if (!value) {
      throw new Error('RentalSelectionId cannot be empty');
    }

    return value as RentalSelectionId;
  },
};
