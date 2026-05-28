import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface RentalOfferAvailabilityRequirementInput {
  readonly equipmentTypeId: string;
  readonly quantityPerItem: number;
}

export interface RentalOfferAvailabilityOfferInput {
  readonly rentalOfferId: string;
  readonly requirements: readonly RentalOfferAvailabilityRequirementInput[];
}

export class GetRentalOfferAvailabilityQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly period: RentalPeriod,
    public readonly rentalOffers: readonly RentalOfferAvailabilityOfferInput[],
  ) {}
}
