import { IQuery } from '@nestjs/cqrs';
import { V2RentableItemKind } from 'src/generated/prisma/enums';

export class GetStorefrontRentalOffersQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly page: number,
    public readonly pageSize: number,
    public readonly kind?: V2RentableItemKind,
    public readonly categoryId?: string,
    public readonly search?: string,
  ) {}
}
