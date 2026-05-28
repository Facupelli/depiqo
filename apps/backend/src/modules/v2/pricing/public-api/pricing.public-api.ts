import { Result } from 'neverthrow';

import { V2BillingUnit } from 'src/generated/prisma/client';
import { PricingError } from '../pricing-engine/errors/pricing.errors';
import { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';
import { BasePricingInput } from '../pricing-engine/base/base-pricing-input.type';
import { PriceDraftRentalInput } from '../features/price-draft-rental/price-draft-rental-input.type';

export type PriceConfirmedRentalSelectionInput = Omit<BasePricingInput['selections'][number], 'ratePlan'>;

export type PriceConfirmedRentalInput = Pick<
  BasePricingInput,
  'tenantId' | 'branchId' | 'rentalPeriod' | 'pricingConfig'
> & {
  customerId: string;
  selections: PriceConfirmedRentalSelectionInput[];
  couponCode?: string;
  calculationDate?: Date;
};

export type PricingPublicApiErrorCode =
  | 'RentalOfferNotFound'
  | 'RatePlanNotFound'
  | 'RatePlanInactive'
  | 'RatePlanNameAlreadyInUse'
  | 'InvalidRatePlan'
  | 'Unexpected';

export interface PricingPublicApiError {
  code: PricingPublicApiErrorCode;
  message: string;
  cause?: unknown;
}

export interface CreateRatePlanAndAttachToRentalOfferInput {
  tenantId: string;
  catalogRentalOfferId: string;
  name: string;
  billingUnit: V2BillingUnit;
  currency: string;
  tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
}

export interface CreateRatePlanAndAttachToRentalOfferResult {
  ratePlanId: string;
  rentalOfferPricingId: string;
}

export interface AttachRatePlanToRentalOfferInput {
  tenantId: string;
  catalogRentalOfferId: string;
  ratePlanId: string;
}

export interface AttachRatePlanToRentalOfferResult {
  ratePlanId: string;
  rentalOfferPricingId: string;
}

export abstract class PricingPublicApi {
  abstract priceConfirmedRental(input: PriceConfirmedRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>>;

  abstract priceDraftRental(input: PriceDraftRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>>;

  abstract createRatePlanAndAttachToRentalOffer(
    input: CreateRatePlanAndAttachToRentalOfferInput,
  ): Promise<Result<CreateRatePlanAndAttachToRentalOfferResult, PricingPublicApiError>>;

  abstract attachRatePlanToRentalOffer(
    input: AttachRatePlanToRentalOfferInput,
  ): Promise<Result<AttachRatePlanToRentalOfferResult, PricingPublicApiError>>;
}

export type { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';
export type { PricingResult, PricingResultLine } from '../pricing-engine/final/pricing-result.type';
export type { BasePricingInput, BasePricingSelectionInput } from '../pricing-engine/base/base-pricing-input.type';
