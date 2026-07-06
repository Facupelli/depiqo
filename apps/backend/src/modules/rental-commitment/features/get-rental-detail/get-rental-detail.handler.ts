import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalDetailResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  getRentalDetailApplicationError,
  GetRentalDetailApplicationError,
} from './get-rental-detail-application.error';
import { GetRentalDetailQuery } from './get-rental-detail.query';
import { RentalPriceSnapshotV1 } from 'src/modules/pricing/public-api/rental-price-snapshot.type';

export type GetRentalDetailResult = Result<GetRentalDetailResponseDto, GetRentalDetailApplicationError>;

type AssignedAssetReadModel = GetRentalDetailResponseDto['equipment'][number]['assignedAssets'][number];

@QueryHandler(GetRentalDetailQuery)
export class GetRentalDetailHandler implements IQueryHandler<GetRentalDetailQuery, GetRentalDetailResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalDetailQuery): Promise<GetRentalDetailResult> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: query.rentalId,
        tenantId: query.tenantId,
      },
      select: {
        id: true,
        status: true,
        source: true,
        notes: true,
        insuranceSelected: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
        priceSnapshot: true,
        createdAt: true,
        updatedAt: true,
        cancelledAt: true,
        confirmedAt: true,
        branchId: true,
        customerId: true,
        deliveryDetails: {
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            contactName: true,
            contactPhone: true,
            notes: true,
          },
        },
        demandLines: {
          select: {
            id: true,
            rentalSelectionId: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
            rentalSelection: {
              select: {
                rentableItemId: true,
                rentableItemNameSnapshot: true,
              },
            },
            assignedAssets: { select: { assetId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        accessorySelections: {
          select: {
            id: true,
            sourceRentalDemandLineId: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
            assignments: { select: { assetId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rental) {
      return err(getRentalDetailApplicationError('RentalNotFound', `Rental "${query.rentalId}" was not found.`));
    }

    const assetIds = [
      ...rental.demandLines.flatMap((line) => line.assignedAssets.map((assignment) => assignment.assetId)),
      ...rental.accessorySelections.flatMap((selection) =>
        selection.assignments.map((assignment) => assignment.assetId),
      ),
    ];
    // TODO: cross-bounded-context-reads
    const [assetsById, branch, customer] = await Promise.all([
      this.getAssetsById(query.tenantId, assetIds),
      this.prisma.client.v2Branch.findFirst({
        where: { id: rental.branchId, tenantId: query.tenantId, deletedAt: null },
        select: { id: true, name: true },
      }),
      rental.customerId
        ? this.prisma.client.v2RentalCustomer.findFirst({
            where: { id: rental.customerId, tenantId: query.tenantId, deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              companyName: true,
              isCompany: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!branch) {
      return err(getRentalDetailApplicationError('RentalNotFound', `Rental "${query.rentalId}" was not found.`));
    }

    return ok({
      id: rental.id,
      number: rental.id.slice(0, 4),
      status: rental.status,
      source: rental.source,
      notes: rental.notes,
      insuranceSelected: rental.insuranceSelected,
      createdAt: rental.createdAt.toISOString(),
      updatedAt: rental.updatedAt.toISOString(),
      cancelledAt: rental.cancelledAt?.toISOString() ?? null,
      confirmedAt: rental.confirmedAt?.toISOString() ?? null,
      customer: customer
        ? {
            id: customer.id,
            displayName: this.resolveCustomerDisplayName(customer),
            email: customer.email,
            phone: customer.phone,
          }
        : null,
      branch: {
        id: branch.id,
        name: branch.name,
      },
      period: {
        start: rental.periodStart.toISOString(),
        end: rental.periodEnd.toISOString(),
      },
      fulfillment: {
        method: rental.fulfillmentMethod,
        deliveryDetails: rental.deliveryDetails,
      },
      equipment: rental.demandLines.map((line) => ({
        id: line.id,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId,
        equipmentTypeName: line.equipmentTypeNameSnapshot,
        rentableItemId: line.rentalSelection.rentableItemId,
        rentableItemName: line.rentalSelection.rentableItemNameSnapshot,
        quantity: line.quantity,
        assignedAssets: line.assignedAssets.map(
          (assignment) => assetsById.get(assignment.assetId) ?? this.emptyAsset(assignment.assetId),
        ),
      })),
      accessories: rental.accessorySelections.map((selection) => ({
        id: selection.id,
        sourceRentalDemandLineId: selection.sourceRentalDemandLineId,
        equipmentTypeId: selection.equipmentTypeId,
        equipmentTypeName: selection.equipmentTypeNameSnapshot,
        quantity: selection.quantity,
        assignedAssets: selection.assignments.map(
          (assignment) => assetsById.get(assignment.assetId) ?? this.emptyAsset(assignment.assetId),
        ),
      })),
      pricing: this.resolvePricing(rental.priceSnapshot),
    });
  }

  private async getAssetsById(tenantId: string, assetIds: string[]): Promise<Map<string, AssignedAssetReadModel>> {
    if (assetIds.length === 0) {
      return new Map();
    }

    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(assetIds)] },
      },
      select: {
        id: true,
        serialNumber: true,
        owner: { select: { id: true, name: true } },
      },
    });

    return new Map(
      assets.map((asset) => [
        asset.id,
        {
          id: asset.id,
          serialNumber: asset.serialNumber,
          owner: asset.owner,
        },
      ]),
    );
  }

  private emptyAsset(assetId: string): AssignedAssetReadModel {
    return { id: assetId, serialNumber: null, owner: null };
  }

  private resolvePricing(priceSnapshot: unknown): GetRentalDetailResponseDto['pricing'] {
    if (!this.isConfirmedRentalPriceSnapshot(priceSnapshot)) {
      return null;
    }

    return {
      ...priceSnapshot.final,
      lines: priceSnapshot.final.lines.map((line) => ({
        ...line,
        manualPricingAdjustment: line.manualPricingAdjustment ?? null,
      })),
      appliedCoupon: priceSnapshot.final.appliedCoupon ?? null,
      manualPricingAdjustment: priceSnapshot.manualPricingAdjustment ?? null,
    };
  }

  private isConfirmedRentalPriceSnapshot(value: unknown): value is RentalPriceSnapshotV1 {
    return (
      typeof value === 'object' &&
      value !== null &&
      'schema' in value &&
      value.schema === 'v2.rental-price-snapshot' &&
      'version' in value &&
      value.version === 1 &&
      'calculated' in value &&
      typeof value.calculated === 'object' &&
      value.calculated !== null &&
      'final' in value &&
      typeof value.final === 'object' &&
      value.final !== null
    );
  }

  private resolveCustomerDisplayName(customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    isCompany: boolean;
  }): string {
    if (customer.isCompany && customer.companyName) {
      return customer.companyName;
    }

    return `${customer.firstName} ${customer.lastName}`.trim();
  }
}
