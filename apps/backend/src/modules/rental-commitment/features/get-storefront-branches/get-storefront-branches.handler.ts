import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { GetStorefrontBranchesQuery } from './get-storefront-branches.query';

export interface StorefrontBranchReadModel {
  id: string;
  name: string;
  timezone: string;
  supportsDelivery: boolean;
  deliveryDefaults: {
    country: string | null;
    stateRegion: string | null;
    city: string | null;
    postalCode: string | null;
  };
}

export type GetStorefrontBranchesResult = StorefrontBranchReadModel[];

@QueryHandler(GetStorefrontBranchesQuery)
export class GetStorefrontBranchesHandler implements IQueryHandler<
  GetStorefrontBranchesQuery,
  GetStorefrontBranchesResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantManagementApi: BranchFacts,
  ) {}

  async execute(query: GetStorefrontBranchesQuery): Promise<GetStorefrontBranchesResult> {
    const branches = await this.prisma.client.v2Branch.findMany({
      where: {
        tenantId: query.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        supportsDelivery: true,
        deliveryDefaultCity: true,
        deliveryDefaultPostalCode: true,
        deliveryDefaultCountry: true,
        deliveryDefaultStateRegion: true,
      },
      orderBy: { name: 'asc' },
    });

    const contextsResult = await this.tenantManagementApi.getBranchFactsBatch({
      tenantId: query.tenantId,
      branchIds: branches.map((branch) => branch.id),
    });

    if (contextsResult.isErr()) {
      throw new Error(contextsResult.error.message, { cause: contextsResult.error });
    }

    const timezoneByBranchId = new Map(
      contextsResult.value.map((context) => [context.branchId, context.effectiveTimezone]),
    );

    return branches.map((branch) => {
      const timezone = timezoneByBranchId.get(branch.id);
      if (!timezone) {
        throw new Error(`Tenant Management omitted branch "${branch.id}" from a successful batch response.`);
      }

      return {
        id: branch.id,
        name: branch.name,
        timezone,
        supportsDelivery: branch.supportsDelivery,
        deliveryDefaults: {
          country: branch.deliveryDefaultCountry,
          stateRegion: branch.deliveryDefaultStateRegion,
          city: branch.deliveryDefaultCity,
          postalCode: branch.deliveryDefaultPostalCode,
        },
      };
    });
  }
}
