import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { GetStorefrontBranchesQuery } from './get-storefront-branches.query';

export interface StorefrontBranchReadModel {
  id: string;
  name: string;
  timezone: string;
}

export type GetStorefrontBranchesResult = StorefrontBranchReadModel[];

@QueryHandler(GetStorefrontBranchesQuery)
export class GetStorefrontBranchesHandler implements IQueryHandler<
  GetStorefrontBranchesQuery,
  GetStorefrontBranchesResult
> {
  constructor(private readonly tenantManagementApi: BranchFacts) {}

  async execute(query: GetStorefrontBranchesQuery): Promise<GetStorefrontBranchesResult> {
    const result = await this.tenantManagementApi.listBranchFacts({ tenantId: query.tenantId });

    if (result.isErr()) {
      throw new Error(result.error.message, { cause: result.error });
    }

    return result.value
      .filter((branch) => branch.isActive && !branch.isDeleted)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map((branch) => ({
        id: branch.branchId,
        name: branch.displayName,
        timezone: branch.effectiveTimezone,
      }));
  }
}
