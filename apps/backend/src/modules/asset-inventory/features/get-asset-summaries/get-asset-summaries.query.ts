import { IQuery } from '@nestjs/cqrs';

export class GetAssetSummariesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly ids: string[],
  ) {}
}
