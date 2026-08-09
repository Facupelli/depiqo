import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetStorefrontRentalOfferAvailabilityQuery } from './get-storefront-rental-offer-availability.query';

interface ActiveAssetBlockRow {
  assetId: string;
}

interface AvailabilityCandidate {
  assetId: string;
  equipmentTypeId: string;
}

export interface StorefrontRentalOfferAvailabilityItemReadModel {
  rentalOfferId: string;
  availableCount: number;
}

export interface GetStorefrontRentalOfferAvailabilityResult {
  data: StorefrontRentalOfferAvailabilityItemReadModel[];
}

// TODO: Resolve authoritative offer requirements through Catalog instead of accepting caller-controlled requirements.
@QueryHandler(GetStorefrontRentalOfferAvailabilityQuery)
export class GetStorefrontRentalOfferAvailabilityHandler implements IQueryHandler<
  GetStorefrontRentalOfferAvailabilityQuery,
  GetStorefrontRentalOfferAvailabilityResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontRentalOfferAvailabilityQuery): Promise<GetStorefrontRentalOfferAvailabilityResult> {
    const equipmentTypeIds = this.collectEquipmentTypeIds(query.rentalOffers);

    if (equipmentTypeIds.length === 0) {
      return {
        data: query.rentalOffers.map((offer) => ({ rentalOfferId: offer.rentalOfferId, availableCount: 0 })),
      };
    }

    const candidates = await this.findAllocatableCandidates({
      tenantId: query.tenantId,
      branchId: query.branchId,
      equipmentTypeIds,
    });

    const blockedAssetIds = await this.findBlockedAssetIds({
      tenantId: query.tenantId,
      assetIds: candidates.map((candidate) => candidate.assetId),
      period: query.period.toPostgresRange(),
    });

    const availableAssetCountByEquipmentType = this.countAvailableAssetsByEquipmentType(candidates, blockedAssetIds);

    return {
      data: query.rentalOffers.map((offer) => ({
        rentalOfferId: offer.rentalOfferId,
        availableCount: this.calculateAvailableCount(offer.requirements, availableAssetCountByEquipmentType),
      })),
    };
  }

  private collectEquipmentTypeIds(rentalOffers: GetStorefrontRentalOfferAvailabilityQuery['rentalOffers']): string[] {
    return [
      ...new Set(
        rentalOffers.flatMap((offer) =>
          offer.requirements
            .filter((requirement) => Number.isInteger(requirement.quantityPerItem) && requirement.quantityPerItem > 0)
            .map((requirement) => requirement.equipmentTypeId),
        ),
      ),
    ];
  }

  private async findAllocatableCandidates(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeIds: readonly string[];
  }): Promise<AvailabilityCandidate[]> {
    const rows = await this.prisma.client.v2RentalAssetCandidate.findMany({
      where: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        equipmentTypeId: { in: [...params.equipmentTypeIds] },
        isActive: true,
        isRentable: true,
        equipmentTypeIsActive: true,
        assetStatus: 'ACTIVE',
      },
      select: {
        assetId: true,
        equipmentTypeId: true,
      },
    });

    return rows;
  }

  private async findBlockedAssetIds(params: {
    tenantId: string;
    assetIds: readonly string[];
    period: string;
  }): Promise<Set<string>> {
    if (params.assetIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.client.$queryRaw<ActiveAssetBlockRow[]>`
      SELECT asset_id AS "assetId"
      FROM v2_asset_blocks
      WHERE tenant_id = ${params.tenantId}
        AND released_at IS NULL
        AND asset_id = ANY(${params.assetIds})
        AND period && ${params.period}::tstzrange
    `;

    return new Set(rows.map((row) => row.assetId));
  }

  private countAvailableAssetsByEquipmentType(
    candidates: readonly AvailabilityCandidate[],
    blockedAssetIds: ReadonlySet<string>,
  ): Map<string, number> {
    const counts = new Map<string, number>();

    for (const candidate of candidates) {
      if (blockedAssetIds.has(candidate.assetId)) {
        continue;
      }

      counts.set(candidate.equipmentTypeId, (counts.get(candidate.equipmentTypeId) ?? 0) + 1);
    }

    return counts;
  }

  private calculateAvailableCount(
    requirements: GetStorefrontRentalOfferAvailabilityQuery['rentalOffers'][number]['requirements'],
    availableAssetCountByEquipmentType: ReadonlyMap<string, number>,
  ): number {
    if (requirements.length === 0) {
      return 0;
    }

    let availableCount = Number.POSITIVE_INFINITY;

    for (const requirement of requirements) {
      if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
        return 0;
      }

      const availableAssets = availableAssetCountByEquipmentType.get(requirement.equipmentTypeId) ?? 0;
      availableCount = Math.min(availableCount, Math.floor(availableAssets / requirement.quantityPerItem));
    }

    return Number.isFinite(availableCount) ? availableCount : 0;
  }
}
