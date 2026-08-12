import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { decodeAcceptedPricingForDocuments } from '../application/accepted-pricing/accepted-pricing-snapshot.decoder';
import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';
import {
  GetAcceptedPricingForDocumentsInput,
  GetRentalNotificationContextInput,
  GetRentalBudgetDocumentFactsInput,
  GetRentalRemitoEquipmentFactsInput,
  RentalAcceptedPricingForDocuments,
  RentalBudgetDocumentFacts,
  RentalRemitoEquipmentFacts,
  RentalCommitmentPublicApi,
  RentalCommitmentPublicApiError,
  RentalNotificationContext,
} from './rental-commitment.public-api';

function rentalCommitmentPublicApiError(
  code: RentalCommitmentPublicApiError['code'],
  message: string,
  cause?: unknown,
): RentalCommitmentPublicApiError {
  return { code, message, cause };
}

@Injectable()
export class RentalCommitmentPublicApiService extends RentalCommitmentPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalNotificationContext(
    input: GetRentalNotificationContextInput,
  ): Promise<Result<RentalNotificationContext, RentalCommitmentPublicApiError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
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
      rentalId: rental.id,
      rentalNumber: rental.id.slice(0, 4),
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.customerId,
      status: rental.status as RentalStatus,
      fulfillmentMethod: (rental.fulfillmentMethod as FulfillmentMethod | null) ?? FulfillmentMethod.Pickup,
      periodStart: rental.periodStart,
      periodEnd: rental.periodEnd,
    });
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

    const pricing = decodeAcceptedPricingForDocuments(
      rental.priceSnapshot,
      rental.selections.map((selection) => selection.priceSnapshot),
    );
    if (pricing.isErr()) {
      return err(rentalCommitmentPublicApiError(pricing.error.code, pricing.error.message, pricing.error));
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

  async getAcceptedPricingForDocuments(
    input: GetAcceptedPricingForDocumentsInput,
  ): Promise<Result<RentalAcceptedPricingForDocuments, RentalCommitmentPublicApiError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        priceSnapshot: true,
        selections: {
          select: {
            priceSnapshot: true,
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

    const pricing = decodeAcceptedPricingForDocuments(
      rental.priceSnapshot,
      rental.selections.map((selection) => selection.priceSnapshot),
    );

    if (pricing.isErr()) {
      return err(rentalCommitmentPublicApiError(pricing.error.code, pricing.error.message, pricing.error));
    }

    return ok(pricing.value);
  }
}
