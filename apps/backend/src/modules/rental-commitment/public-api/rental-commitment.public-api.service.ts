import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { decodeAcceptedRentalPricing } from '../application/accepted-pricing/accepted-pricing-snapshot.decoder';
import { RentalStatus } from '../domain/rental-status';
import {
  GetRentalBudgetDocumentFactsInput,
  GetRentalRemitoEquipmentFactsInput,
  RentalBudgetDocumentFacts,
  RentalRemitoEquipmentFacts,
  RentalCommitmentPublicApi,
  RentalCommitmentPublicApiError,
} from './rental-commitment.public-api';

function rentalCommitmentPublicApiError(
  code: RentalCommitmentPublicApiError['code'],
  message: string,
): RentalCommitmentPublicApiError {
  return { code, message };
}

@Injectable()
export class RentalCommitmentPublicApiService extends RentalCommitmentPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalBudgetDocumentFacts(
    input: GetRentalBudgetDocumentFactsInput,
  ): Promise<Result<RentalBudgetDocumentFacts, RentalCommitmentPublicApiError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        branchId: true,
        customerId: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        priceSnapshot: true,
        selections: {
          select: {
            rentableItemNameSnapshot: true,
            quantity: true,
            priceSnapshot: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        demandLines: {
          select: {
            id: true,
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
        rentalCommitmentPublicApiError(
          'RentalNotFound',
          `Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    const pricing = decodeAcceptedRentalPricing(
      rental.priceSnapshot,
      rental.selections.map((selection) => selection.priceSnapshot),
    );
    if (pricing.isErr()) {
      return err(rentalCommitmentPublicApiError(pricing.error.code, pricing.error.message));
    }

    return ok({
      rentalId: rental.id,
      branchId: rental.branchId,
      customerId: rental.customerId,
      status: rental.status as RentalStatus,
      periodStart: rental.periodStart,
      periodEnd: rental.periodEnd,
      pricing: pricing.value,
      selections: rental.selections.map((selection) => ({
        name: selection.rentableItemNameSnapshot,
        quantity: selection.quantity,
      })),
      demandLines: rental.demandLines.map((line) => ({
        demandLineId: line.id,
        equipmentTypeId: line.equipmentTypeId,
        name: line.equipmentTypeNameSnapshot,
        quantity: line.quantity,
      })),
    });
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
        rentalCommitmentPublicApiError(
          'RentalNotFound',
          `Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`,
        ),
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
