import { IQuery } from '@nestjs/cqrs';

export class SearchRentalOffersQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly page: number,
    public readonly pageSize: number,
    public readonly search?: string,
  ) {}
}
