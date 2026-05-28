import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
        timezone: true,
        supportsDelivery: true,
        deliveryDefaultCity: true,
        deliveryDefaultPostalCode: true,
        deliveryDefaultCountry: true,
        deliveryDefaultStateRegion: true,
        tenant: {
          select: {
            config: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      timezone: branch.timezone ?? getTenantTimezone(branch.tenant.config),
      supportsDelivery: branch.supportsDelivery,
      deliveryDefaults: {
        country: branch.deliveryDefaultCountry,
        stateRegion: branch.deliveryDefaultStateRegion,
        city: branch.deliveryDefaultCity,
        postalCode: branch.deliveryDefaultPostalCode,
      },
    }));
  }
}

function getTenantTimezone(config: unknown): string {
  if (typeof config !== 'object' || config === null || !('timezone' in config)) {
    return 'UTC';
  }

  const timezone = (config as { timezone?: unknown }).timezone;
  return typeof timezone === 'string' && timezone.trim().length > 0 ? timezone : 'UTC';
}
