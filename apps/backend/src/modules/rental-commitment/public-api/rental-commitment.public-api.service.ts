import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetRentalRemitoEquipmentFactsInput,
  RentalCommitmentPublicApi,
  RentalCommitmentPublicApiError,
  RentalRemitoEquipmentFacts,
} from './rental-commitment.public-api';

function rentalCommitmentPublicApiError(message: string): RentalCommitmentPublicApiError {
  return { code: 'RentalNotFound', message };
}

@Injectable()
export class RentalCommitmentPublicApiService extends RentalCommitmentPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalRemitoEquipmentFacts(
    input: GetRentalRemitoEquipmentFactsInput,
  ): Promise<Result<RentalRemitoEquipmentFacts, RentalCommitmentPublicApiError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        demandLines: {
          select: {
            id: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
            assignedAssets: {
              select: {
                assetId: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!rental) {
      return err(
        rentalCommitmentPublicApiError(`Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`),
      );
    }

    return ok({
      demandLines: rental.demandLines.map((line) => ({
        demandLineId: line.id,
        equipmentTypeId: line.equipmentTypeId,
        name: line.equipmentTypeNameSnapshot,
        quantity: line.quantity,
        assignedAssetIds: line.assignedAssets.map((assignment) => assignment.assetId),
      })),
    });
  }
}
