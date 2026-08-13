import { Result } from 'neverthrow';

import { PricingError } from '../pricing-engine/errors/pricing.errors';
import { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';
import { BasePricingInput } from '../pricing-engine/base/base-pricing-input.type';
import { PriceDraftRentalInput } from '../features/price-draft-rental/price-draft-rental-input.type';
import { ManualPricingAdjustmentInput } from '../features/price-draft-rental/manual-adjustments/manual-pricing-adjustment.types';

export type PriceConfirmedRentalSelectionInput = Omit<BasePricingInput['selections'][number], 'ratePlan'>;

export type PriceConfirmedRentalInput = Pick<
  BasePricingInput,
  'tenantId' | 'branchId' | 'rentalPeriod' | 'pricingConfig'
> & {
  customerId: string;
  selections: PriceConfirmedRentalSelectionInput[];
  couponCode?: string;
  calculationDate?: Date;
  manualPricingAdjustment?: ManualPricingAdjustmentInput;
};

export abstract class PricingPublicApi {
  abstract priceConfirmedRental(input: PriceConfirmedRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>>;

  abstract priceDraftRental(input: PriceDraftRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>>;
}

export type { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';
export type { PricingResult, PricingResultLine } from '../pricing-engine/final/pricing-result.type';
export type { BasePricingInput, BasePricingSelectionInput } from '../pricing-engine/base/base-pricing-input.type';
