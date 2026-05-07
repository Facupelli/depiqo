import { IQuery } from '@nestjs/cqrs';

export class GetProductTypeAccessoryLinksQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly primaryRentalItemId: string,
  ) {}
}
