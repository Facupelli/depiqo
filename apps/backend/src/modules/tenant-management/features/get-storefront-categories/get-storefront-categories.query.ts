import { IQuery } from '@nestjs/cqrs';

export class GetStorefrontCategoriesQuery implements IQuery {
  constructor(public readonly tenantId: string) {}
}
