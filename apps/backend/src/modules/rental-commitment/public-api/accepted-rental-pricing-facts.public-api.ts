import { Result } from 'neverthrow';

export interface GetAcceptedRentalPricingFactsInput {
  tenantId: string;
  rentalId: string;
}

export type AcceptedRentalPricingBillingUnit = 'HOUR' | 'DAY' | 'WEEK';

export interface AcceptedRentalPricingMoney {
  amount: string;
  currency: string;
}

export interface AcceptedRentalPricing {
  total: AcceptedRentalPricingMoney;
  acceptedCustomerTotal: string | null;
  chargedUnits: number;
  billingUnit?: AcceptedRentalPricingBillingUnit;
}

export type AcceptedRentalPricingFactsErrorCode = 'RentalNotFound' | 'AcceptedPricingSnapshotInvalid';

export interface AcceptedRentalPricingFactsError {
  code: AcceptedRentalPricingFactsErrorCode;
  message: string;
}

export abstract class AcceptedRentalPricingFacts {
  abstract getAcceptedRentalPricingFacts(
    input: GetAcceptedRentalPricingFactsInput,
  ): Promise<Result<AcceptedRentalPricing, AcceptedRentalPricingFactsError>>;
}
