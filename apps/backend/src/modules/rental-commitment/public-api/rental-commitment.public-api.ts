import { Result } from 'neverthrow';

import { RentalStatus } from '../domain/rental-status';
import { AcceptedRentalPricing } from './accepted-rental-pricing-facts.public-api';

export interface GetRentalBudgetDocumentFactsInput {
  tenantId: string;
  rentalId: string;
}

export interface GetRentalRemitoEquipmentFactsInput {
  tenantId: string;
  rentalId: string;
}

export interface RentalBudgetDocumentFacts {
  rentalId: string;
  branchId: string;
  customerId: string | null;
  status: RentalStatus;
  periodStart: Date;
  periodEnd: Date;
  pricing: AcceptedRentalPricing;
  selections: Array<{
    name: string;
    quantity: number;
  }>;
  demandLines: Array<{
    demandLineId: string;
    equipmentTypeId: string;
    name: string;
    quantity: number;
  }>;
}

export interface RentalRemitoEquipmentFacts {
  demandLines: Array<{
    demandLineId: string;
    equipmentTypeId: string;
    name: string;
    quantity: number;
    assignedAssetIds: string[];
  }>;
}

export type RentalCommitmentPublicApiErrorCode =
  | 'RentalNotFound'
  | 'AcceptedPricingSnapshotInvalid'
  | 'AcceptedPricingUnitsIncomplete';

export interface RentalCommitmentPublicApiError {
  code: RentalCommitmentPublicApiErrorCode;
  message: string;
}

export abstract class RentalCommitmentPublicApi {
  abstract getRentalBudgetDocumentFacts(
    input: GetRentalBudgetDocumentFactsInput,
  ): Promise<Result<RentalBudgetDocumentFacts, RentalCommitmentPublicApiError>>;

  abstract getRentalRemitoEquipmentFacts(
    input: GetRentalRemitoEquipmentFactsInput,
  ): Promise<Result<RentalRemitoEquipmentFacts, RentalCommitmentPublicApiError>>;
}
