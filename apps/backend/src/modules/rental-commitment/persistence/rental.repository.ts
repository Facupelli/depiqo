import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

import { Rental } from '../domain/rental.aggregate';
import { AssetId } from '../domain/types/rental-commitment-ids';
import { RentalOwnerSplitDraft } from '../owner-split/owner-split-calculator.types';

export interface SaveRentalOptions {
  persistence?: 'DETAILS' | 'OPERATIONAL';
  ownerSplits?: RentalOwnerSplitDraft[];
  replaceAccessories?: boolean;
  accessoryAssetIds?: AssetId[];
  expectedUpdatedAt?: Date;
  tx?: PrismaTransactionClient;
}

export interface SaveRentalResult {
  updatedAt: Date;
}

export abstract class RentalRepository {
  abstract findById(tenantId: string, rentalId: string, tx?: PrismaTransactionClient): Promise<Rental | null>;
  abstract save(rental: Rental, options?: SaveRentalOptions): Promise<SaveRentalResult | null>;
}
