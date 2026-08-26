import { IQuery } from '@nestjs/cqrs';

export class GetRentableItemSummariesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly ids: string[],
  ) {}
}
