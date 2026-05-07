import { IQuery } from '@nestjs/cqrs';
import { RentalItemKind } from '@repo/types';

export class GetProductTypesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly categoryId?: string,
    public readonly isActive?: boolean,
    public readonly search?: string,
    public readonly kind?: RentalItemKind,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
