import { IQuery } from '@nestjs/cqrs';

export class GetAvailableAccessoriesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly primaryRentalItemId: string,
    public readonly search?: string,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
