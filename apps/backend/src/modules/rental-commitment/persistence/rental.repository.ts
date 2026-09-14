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

export interface ReplaceDraftRentalOptions {
  expectedVersion: number;
  tx?: PrismaTransactionClient;
}

export class UnsafeDraftRentalReplacementError extends Error {
  constructor(
    public readonly rentalId: string,
    public readonly forbiddenState: string[],
  ) {
    super(
      `Draft rental "${rentalId}" cannot be replaced because it contains forbidden operational state: ${forbiddenState.join(', ')}.`,
    );
  }
}

export abstract class RentalRepository {
  abstract findById(tenantId: string, rentalId: string, tx?: PrismaTransactionClient): Promise<Rental | null>;
  abstract save(rental: Rental, options?: SaveRentalOptions): Promise<SaveRentalResult | null>;
  abstract replaceDraft(rental: Rental, options: ReplaceDraftRentalOptions): Promise<SaveRentalResult | null>;
}
