import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface StorefrontRentalOfferAvailabilityRequirementInput {
  readonly equipmentTypeId: string;
  readonly quantityPerItem: number;
}

export interface StorefrontRentalOfferAvailabilityOfferInput {
  readonly rentalOfferId: string;
  readonly requirements: readonly StorefrontRentalOfferAvailabilityRequirementInput[];
}

export class GetStorefrontRentalOfferAvailabilityQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly period: RentalPeriod,
    public readonly rentalOffers: readonly StorefrontRentalOfferAvailabilityOfferInput[],
  ) {}
}
