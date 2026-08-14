import { IQuery } from '@nestjs/cqrs';

export class GetRentableItemDetailQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentableItemId: string,
  ) {}
}
