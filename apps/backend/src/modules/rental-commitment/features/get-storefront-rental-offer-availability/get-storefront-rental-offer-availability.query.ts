import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export class GetStorefrontRentalOfferAvailabilityQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly period: RentalPeriod,
    public readonly rentalOfferIds: readonly string[],
  ) {}
}
