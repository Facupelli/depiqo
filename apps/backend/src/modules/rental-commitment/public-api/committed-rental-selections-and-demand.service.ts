import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CommittedRentalSelectionsAndDemand,
  CommittedRentalSelectionsAndDemandError,
  CommittedRentalSelectionsAndDemandResult,
  CommittedRentableItemKind,
  GetCommittedRentalSelectionsAndDemandInput,
} from './committed-rental-selections-and-demand.public-api';

function committedRentalSelectionsAndDemandError(message: string): CommittedRentalSelectionsAndDemandError {
  return { code: 'RentalNotFound', message };
}

@Injectable()
export class CommittedRentalSelectionsAndDemandService extends CommittedRentalSelectionsAndDemand {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getCommittedRentalSelectionsAndDemand(
    input: GetCommittedRentalSelectionsAndDemandInput,
  ): Promise<Result<CommittedRentalSelectionsAndDemandResult, CommittedRentalSelectionsAndDemandError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        selections: {
          select: {
            id: true,
            rentalOfferId: true,
            rentableItemId: true,
            rentableItemNameSnapshot: true,
            rentableItemKindSnapshot: true,
            quantity: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        demandLines: {
          select: {
            id: true,
            rentalSelectionId: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!rental) {
      return err(
        committedRentalSelectionsAndDemandError(
          `Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    return ok({
      selections: rental.selections.map((selection) => ({
        selectionId: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
        rentableItemKindSnapshot: selection.rentableItemKindSnapshot as CommittedRentableItemKind,
        quantity: selection.quantity,
      })),
      demandLines: rental.demandLines.map((line) => ({
        demandLineId: line.id,
        sourceSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId,
        equipmentTypeNameSnapshot: line.equipmentTypeNameSnapshot,
        quantity: line.quantity,
      })),
    });
  }
}
