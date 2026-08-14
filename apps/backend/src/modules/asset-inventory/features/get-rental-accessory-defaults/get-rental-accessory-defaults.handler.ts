import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalAccessoryDefaultsResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2AssetBlockType } from 'src/generated/prisma/enums';

import {
  getRentalAccessoryDefaultsError,
  GetRentalAccessoryDefaultsError,
} from './get-rental-accessory-defaults.errors';
import { GetRentalAccessoryDefaultsQuery } from './get-rental-accessory-defaults.query';

export type GetRentalAccessoryDefaultsResult = Result<
  GetRentalAccessoryDefaultsResponseDto,
  GetRentalAccessoryDefaultsError
>;

type DemandLine = {
  id: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
};

type AvailabilityCandidate = {
  assetId: string;
  equipmentTypeId: string;
};

type ActiveAssetBlockRow = {
  assetId: string;
};

@QueryHandler(GetRentalAccessoryDefaultsQuery)
export class GetRentalAccessoryDefaultsHandler implements IQueryHandler<
  GetRentalAccessoryDefaultsQuery,
  GetRentalAccessoryDefaultsResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalAccessoryDefaultsQuery): Promise<GetRentalAccessoryDefaultsResult> {
    // TODO: cross-bounded-context-read: this Asset Inventory query reads Rental Commitment models directly.
    // Move rental order and period/availability reads behind a Rental Commitment public query/API.
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { id: query.rentalId, tenantId: query.tenantId },
      select: {
        id: true,
        branchId: true,
        periodStart: true,
        periodEnd: true,
        demandLines: {
          select: {
            id: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rental) {
      return err(
        getRentalAccessoryDefaultsError(
          'asset_inventory.rental_not_found',
          `Rental "${query.rentalId}" was not found.`,
          undefined,
          { rentalId: query.rentalId },
        ),
      );
    }

    const sourceEquipmentTypeIds = [...new Set(rental.demandLines.map((line) => line.equipmentTypeId))];

    if (sourceEquipmentTypeIds.length === 0) {
      return ok({ rentalOrderId: rental.id, suggestions: [] });
    }

    const defaults = await this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
      where: {
        tenantId: query.tenantId,
        equipmentTypeId: { in: sourceEquipmentTypeIds },
      },
      select: {
        equipmentTypeId: true,
        accessoryEquipmentTypeId: true,
        quantity: true,
        accessoryEquipmentType: { select: { name: true } },
      },
      orderBy: [{ equipmentTypeId: 'asc' }, { accessoryEquipmentType: { name: 'asc' } }],
    });

    if (defaults.length === 0) {
      return ok({ rentalOrderId: rental.id, suggestions: [] });
    }

    const accessoryEquipmentTypeIds = [...new Set(defaults.map((defaultItem) => defaultItem.accessoryEquipmentTypeId))];
    const availableCountByEquipmentType = await this.getAvailableCountByEquipmentType({
      tenantId: query.tenantId,
      branchId: rental.branchId,
      equipmentTypeIds: accessoryEquipmentTypeIds,
      rentalId: rental.id,
      periodStart: rental.periodStart,
      periodEnd: rental.periodEnd,
    });

    const defaultsBySourceEquipmentTypeId = new Map<string, typeof defaults>();
    for (const defaultItem of defaults) {
      const items = defaultsBySourceEquipmentTypeId.get(defaultItem.equipmentTypeId) ?? [];
      items.push(defaultItem);
      defaultsBySourceEquipmentTypeId.set(defaultItem.equipmentTypeId, items);
    }

    const suggestions = rental.demandLines.flatMap((line: DemandLine) => {
      const lineDefaults = defaultsBySourceEquipmentTypeId.get(line.equipmentTypeId) ?? [];

      return lineDefaults.map((defaultItem) => ({
        sourceRentalDemandLineId: line.id,
        sourceEquipmentTypeId: line.equipmentTypeId,
        sourceEquipmentTypeName: line.equipmentTypeNameSnapshot,
        accessoryEquipmentTypeId: defaultItem.accessoryEquipmentTypeId,
        accessoryEquipmentTypeName: defaultItem.accessoryEquipmentType.name,
        quantityPerUnit: defaultItem.quantity,
        sourceQuantity: line.quantity,
        recommendedQuantity: defaultItem.quantity * line.quantity,
        availableCount: availableCountByEquipmentType.get(defaultItem.accessoryEquipmentTypeId) ?? 0,
      }));
    });

    return ok({ rentalOrderId: rental.id, suggestions });
  }

  private async getAvailableCountByEquipmentType(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeIds: readonly string[];
    rentalId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<Map<string, number>> {
    if (params.equipmentTypeIds.length === 0) {
      return new Map();
    }

    const candidates = await this.prisma.client.v2RentalAssetCandidate.findMany({
      where: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        equipmentTypeId: { in: [...params.equipmentTypeIds] },
        assetStatus: 'ACTIVE',
      },
      select: {
        assetId: true,
        equipmentTypeId: true,
      },
    });

    const blockedAssetIds = await this.findBlockedAssetIds({
      tenantId: params.tenantId,
      rentalId: params.rentalId,
      assetIds: candidates.map((candidate) => candidate.assetId),
      period: this.toPostgresRange(params.periodStart, params.periodEnd),
    });

    const counts = new Map<string, number>();
    for (const candidate of candidates satisfies AvailabilityCandidate[]) {
      if (blockedAssetIds.has(candidate.assetId)) {
        continue;
      }

      counts.set(candidate.equipmentTypeId, (counts.get(candidate.equipmentTypeId) ?? 0) + 1);
    }

    return counts;
  }

  private async findBlockedAssetIds(params: {
    tenantId: string;
    rentalId: string;
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
        AND asset_id IN (${Prisma.join(params.assetIds)})
        AND period && ${params.period}::tstzrange
        AND NOT (rental_id = ${params.rentalId} AND block_type = ${V2AssetBlockType.ACCESSORY})
    `;

    return new Set(rows.map((row) => row.assetId));
  }

  private toPostgresRange(start: Date, end: Date): string {
    return `[${start.toISOString()}, ${end.toISOString()})`;
  }
}
