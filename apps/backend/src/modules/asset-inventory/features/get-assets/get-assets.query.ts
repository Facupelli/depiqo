import { IQuery } from '@nestjs/cqrs';

import type { GetAssetsQueryDto } from '@repo/api-contracts';

export class GetAssetsQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly filters: GetAssetsQueryDto,
  ) {}
}
