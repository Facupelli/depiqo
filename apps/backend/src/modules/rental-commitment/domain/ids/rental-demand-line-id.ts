import { randomUUID } from 'crypto';

export type RentalDemandLineId = string & { readonly __brand: 'RentalDemandLineId' };

export const RentalDemandLineId = {
  create(): RentalDemandLineId {
    return randomUUID() as RentalDemandLineId;
  },

  from(value: string): RentalDemandLineId {
    if (!value) {
      throw new Error('RentalDemandLineId cannot be empty');
    }

    return value as RentalDemandLineId;
  },
};
