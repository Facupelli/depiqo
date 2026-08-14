import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetRentalPhysicalAssignmentsInput,
  RentalPhysicalAssignments,
  RentalPhysicalAssignmentsError,
  RentalPhysicalAssignmentsResult,
} from './rental-physical-assignments.public-api';

function rentalPhysicalAssignmentsError(message: string): RentalPhysicalAssignmentsError {
  return { code: 'RentalNotFound', message };
}

@Injectable()
export class RentalPhysicalAssignmentsService extends RentalPhysicalAssignments {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalPhysicalAssignments(
    input: GetRentalPhysicalAssignmentsInput,
  ): Promise<Result<RentalPhysicalAssignmentsResult, RentalPhysicalAssignmentsError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        demandLines: {
          select: {
            id: true,
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
        accessorySelections: {
          select: {
            id: true,
            assignments: {
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
        rentalPhysicalAssignmentsError(`Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`),
      );
    }

    return ok({
      demandAssignments: rental.demandLines.map((line) => ({
        demandLineId: line.id,
        assignedAssetIds: line.assignedAssets.map((assignment) => assignment.assetId),
      })),
      accessoryAssignments: rental.accessorySelections.map((selection) => ({
        accessorySelectionId: selection.id,
        assignedAssetIds: selection.assignments.map((assignment) => assignment.assetId),
      })),
    });
  }
}
