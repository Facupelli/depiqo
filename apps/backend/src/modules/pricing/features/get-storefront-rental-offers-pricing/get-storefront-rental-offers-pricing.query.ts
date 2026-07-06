import { IQuery } from '@nestjs/cqrs';

export class GetStorefrontRentalOffersPricingQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalOfferIds: string[],
  ) {}
}
