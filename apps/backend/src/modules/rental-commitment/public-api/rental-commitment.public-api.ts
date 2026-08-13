import { Result } from 'neverthrow';

import { RentalStatus } from '../domain/rental-status';

export interface GetAcceptedPricingForDocumentsInput {
  tenantId: string;
  rentalId: string;
}

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
  pricing: RentalAcceptedPricingForDocuments;
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

export type RentalAcceptedPricingBillingUnit = 'HOUR' | 'DAY' | 'WEEK';

export interface RentalAcceptedPricingMoney {
  amount: string;
  currency: string;
}

export interface RentalAcceptedPricingForDocuments {
  total: RentalAcceptedPricingMoney;
  chargedUnits: number;
  billingUnit?: RentalAcceptedPricingBillingUnit;
}

export type RentalCommitmentPublicApiErrorCode =
  | 'RentalNotFound'
  | 'AcceptedPricingSnapshotInvalid'
  | 'AcceptedPricingUnitsIncomplete';

export interface RentalCommitmentPublicApiError {
  code: RentalCommitmentPublicApiErrorCode;
  message: string;
  cause?: unknown;
}

export abstract class RentalCommitmentPublicApi {
  abstract getAcceptedPricingForDocuments(
    input: GetAcceptedPricingForDocumentsInput,
  ): Promise<Result<RentalAcceptedPricingForDocuments, RentalCommitmentPublicApiError>>;

  abstract getRentalBudgetDocumentFacts(
    input: GetRentalBudgetDocumentFactsInput,
  ): Promise<Result<RentalBudgetDocumentFacts, RentalCommitmentPublicApiError>>;

  abstract getRentalRemitoEquipmentFacts(
    input: GetRentalRemitoEquipmentFactsInput,
  ): Promise<Result<RentalRemitoEquipmentFacts, RentalCommitmentPublicApiError>>;
}
