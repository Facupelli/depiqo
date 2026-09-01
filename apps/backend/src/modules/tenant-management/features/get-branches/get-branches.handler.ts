import type { BranchOperationalLocationDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetBranchesQuery } from './get-branches.query';

export interface GetBranchesBranchReadModel {
  id: string;
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationDto | null;
  timezone: string | null;
  isActive: boolean;
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
        operationalLocationFormattedAddress: true,
        operationalLocationLatitude: true,
        operationalLocationLongitude: true,
        operationalLocationStreet: true,
        operationalLocationStreetNumber: true,
        operationalLocationCity: true,
        operationalLocationStateRegion: true,
        operationalLocationPostalCode: true,
        operationalLocationCountry: true,
        operationalLocationProviderPlaceId: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      operationalLocation:
        branch.operationalLocationFormattedAddress !== null &&
        branch.operationalLocationLatitude !== null &&
        branch.operationalLocationLongitude !== null
          ? {
              formattedAddress: branch.operationalLocationFormattedAddress,
              latitude: branch.operationalLocationLatitude,
              longitude: branch.operationalLocationLongitude,
              street: branch.operationalLocationStreet,
              streetNumber: branch.operationalLocationStreetNumber,
              city: branch.operationalLocationCity,
              stateRegion: branch.operationalLocationStateRegion,
              postalCode: branch.operationalLocationPostalCode,
              country: branch.operationalLocationCountry,
              providerPlaceId: branch.operationalLocationProviderPlaceId,
            }
          : null,
      timezone: branch.timezone,
      isActive: branch.isActive,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    }));
  }
}
