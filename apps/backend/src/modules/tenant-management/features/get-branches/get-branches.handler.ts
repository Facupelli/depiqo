import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetBranchesQuery } from './get-branches.query';

export interface GetBranchesBranchReadModel {
  id: string;
  name: string;
  address: string | null;
  timezone: string | null;
  isActive: boolean;
  supportsDelivery: boolean;
  deliveryDefaultCountry: string | null;
  deliveryDefaultStateRegion: string | null;
  deliveryDefaultCity: string | null;
  deliveryDefaultPostalCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GetBranchesResult = GetBranchesBranchReadModel[];

@QueryHandler(GetBranchesQuery)
export class GetBranchesHandler implements IQueryHandler<GetBranchesQuery, GetBranchesResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBranchesQuery): Promise<GetBranchesResult> {
    const branches = await this.prisma.client.v2Branch.findMany({
      where: {
        tenantId: query.tenantId,
        deletedAt: null,
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      select: {
        id: true,
        name: true,
        address: true,
        timezone: true,
        isActive: true,
        supportsDelivery: true,
        deliveryDefaultCountry: true,
        deliveryDefaultStateRegion: true,
        deliveryDefaultCity: true,
        deliveryDefaultPostalCode: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      timezone: branch.timezone,
      isActive: branch.isActive,
      supportsDelivery: branch.supportsDelivery,
      deliveryDefaultCountry: branch.deliveryDefaultCountry,
      deliveryDefaultStateRegion: branch.deliveryDefaultStateRegion,
      deliveryDefaultCity: branch.deliveryDefaultCity,
      deliveryDefaultPostalCode: branch.deliveryDefaultPostalCode,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    }));
  }
}
