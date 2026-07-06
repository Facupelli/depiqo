import { IQuery } from '@nestjs/cqrs';

export class GetRentalOffersPricingQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalOfferIds: string[],
  ) {}
}
