export type PricingBillingUnit = 'HOUR' | 'DAY' | 'WEEK';

export interface GetPricingRentalOfferStartingPriceFactsInput {
  tenantId: string;
  rentalOfferIds: string[];
}

export interface PricingRentalOfferStartingPriceFact {
  rentalOfferId: string;
  amount: string;
  currency: string;
  billingUnit: PricingBillingUnit;
}

export abstract class PricingRentalOfferStartingPriceFacts {
  abstract getFacts(
    input: GetPricingRentalOfferStartingPriceFactsInput,
  ): Promise<PricingRentalOfferStartingPriceFact[]>;
}
