import { randomUUID } from 'crypto';

export type RentalDemandLineId = string & { readonly __brand: 'RentalDemandLineId' };

export const RentalDemandLineId = {
  create(): RentalDemandLineId {
    // SAFETY: randomUUID() always returns a non-empty UUID string, which satisfies this opaque identifier brand.
    return randomUUID() as RentalDemandLineId;
  },

  from(value: string): RentalDemandLineId {
    if (!value) {
      throw new Error('RentalDemandLineId cannot be empty');
    }

    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    return value as RentalDemandLineId;
  },
};
