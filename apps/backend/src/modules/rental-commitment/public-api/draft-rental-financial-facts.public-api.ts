import { Result } from 'neverthrow';

export interface GetDraftRentalFinancialFactsInput {
  tenantId: string;
  rentalId: string;
}

export interface DraftRentalFinancialFactsResult {
  rentalVersion: number;
  equipmentAndInsuranceAmount: string;
  deliveryCharge: string | null;
  deliveryArrangement: 'ROUTED' | 'STAFF_ARRANGED' | null;
  customerTotal: string;
  currency: string;
  chargedUnits: number;
}

export interface DraftRentalFinancialFactsError {
  code: 'RentalNotFound' | 'RentalNotDraft' | 'DraftFinancialFactsInvalid';
  message: string;
}

export abstract class DraftRentalFinancialFacts {
  abstract getDraftRentalFinancialFacts(
    input: GetDraftRentalFinancialFactsInput,
  ): Promise<Result<DraftRentalFinancialFactsResult, DraftRentalFinancialFactsError>>;
}
