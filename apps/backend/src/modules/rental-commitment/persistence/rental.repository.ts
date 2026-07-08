import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

import { Rental } from '../domain/rental.aggregate';
import { RentalOwnerSplitDraft } from '../owner-split/owner-split-calculator.types';

export interface SaveRentalOptions {
  ownerSplits?: RentalOwnerSplitDraft[];
  tx?: PrismaTransactionClient;
}

export abstract class RentalRepository {
  abstract findById(tenantId: string, rentalId: string): Promise<Rental | null>;
  abstract save(rental: Rental, options?: SaveRentalOptions): Promise<void>;
}
