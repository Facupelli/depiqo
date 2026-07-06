import { Prisma } from 'src/generated/prisma/client';

import { Rental } from '../domain/rental.aggregate';
import { RentalOwnerSplitDraft } from '../owner-split/owner-split-calculator.types';

export interface SaveRentalOptions {
  ownerSplits?: RentalOwnerSplitDraft[];
  tx?: Prisma.TransactionClient;
}

export abstract class RentalRepository {
  abstract findById(tenantId: string, rentalId: string): Promise<Rental | null>;
  abstract save(rental: Rental, options?: SaveRentalOptions): Promise<void>;
}
