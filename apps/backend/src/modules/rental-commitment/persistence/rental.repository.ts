import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

import { Rental } from '../domain/rental.aggregate';
import { RentalOwnerSplitDraft } from '../owner-split/owner-split-calculator.types';

export interface ConfirmationOperationPersistence {
  operationId: string;
  fingerprint: string;
}

export interface SaveRentalOptions {
  persistence?: 'DETAILS';
  ownerSplits?: RentalOwnerSplitDraft[];
  confirmationOperation?: ConfirmationOperationPersistence;
  expectedVersion?: number;
  tx?: PrismaTransactionClient;
}

export interface SaveRentalResult {
  version: number;
  updatedAt: Date;
}

export abstract class RentalRepository {
  abstract findById(tenantId: string, rentalId: string, tx?: PrismaTransactionClient): Promise<Rental | null>;
  abstract save(rental: Rental, options?: SaveRentalOptions): Promise<SaveRentalResult | null>;
}
