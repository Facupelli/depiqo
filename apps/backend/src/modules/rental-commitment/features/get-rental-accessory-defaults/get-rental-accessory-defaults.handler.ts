import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalAccessoryDefaultsResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2AssetBlockType, V2RentalStatus } from 'src/generated/prisma/enums';
import { AccessoryPreparationInventoryFacts } from 'src/modules/asset-inventory/public-api/accessory-preparation-inventory-facts.public-api';
import { TenantRentalAssetBufferSettings } from 'src/modules/tenant-management/public-api/tenant-rental-asset-buffer-settings.public-api';

import { deriveBufferedAssetBlockPeriod } from '../../domain/asset-block-period';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import { RentalInvalidFieldError } from '../../domain/errors/rental-commitment.errors';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import {
  getRentalAccessoryDefaultsError,
  GetRentalAccessoryDefaultsError,
} from './get-rental-accessory-defaults.errors';
import { GetRentalAccessoryDefaultsQuery } from './get-rental-accessory-defaults.query';

export type GetRentalAccessoryDefaultsResult = Result<
  GetRentalAccessoryDefaultsResponseDto,
  GetRentalAccessoryDefaultsError
>;

type ActiveAssetBlockRow = { assetId: string };

@QueryHandler(GetRentalAccessoryDefaultsQuery)
export class GetRentalAccessoryDefaultsHandler implements IQueryHandler<
  GetRentalAccessoryDefaultsQuery,
  GetRentalAccessoryDefaultsResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryFacts: AccessoryPreparationInventoryFacts,
    private readonly tenantBufferSettings: TenantRentalAssetBufferSettings,
  ) {}

  async execute(query: GetRentalAccessoryDefaultsQuery): Promise<GetRentalAccessoryDefaultsResult> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { id: query.rentalId, tenantId: query.tenantId },
      select: {
        id: true,
        branchId: true,
        status: true,
        confirmedAt: true,
        periodStart: true,
        periodEnd: true,
        acceptedBeforeBufferMinutes: true,
        acceptedAfterBufferMinutes: true,
        acceptedDeliverySnapshot: true,
        demandLines: {
          where: { removedAt: null },
          select: { id: true, equipmentTypeId: true, equipmentTypeNameSnapshot: true, quantity: true },
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
    if (sourceEquipmentTypeIds.length === 0) return ok({ rentalOrderId: rental.id, suggestions: [] });

    const operationTime = new Date();
    const inventory = await this.inventoryFacts.getAccessoryPreparationInventoryFacts({
      tenantId: query.tenantId,
      branchId: rental.branchId,
      sourceEquipmentTypeIds,
      operationTime,
    });
    if (inventory.defaults.length === 0) return ok({ rentalOrderId: rental.id, suggestions: [] });

    const usesAcceptedFacts = rental.status === V2RentalStatus.CONFIRMED || rental.confirmedAt !== null;
    const buffer = usesAcceptedFacts
      ? this.resolveAcceptedBuffer(rental.acceptedBeforeBufferMinutes, rental.acceptedAfterBufferMinutes)
      : await this.resolveCurrentBuffer(query.tenantId);
    const participationStart =
      operationTime >= rental.periodStart && operationTime < rental.periodEnd ? operationTime : rental.periodStart;
    const participationPeriod = new RentalPeriod(participationStart, rental.periodEnd);
    const clampStartAt = participationStart === operationTime ? operationTime : undefined;
    const operationalPeriod = usesAcceptedFacts
      ? deriveConfirmedAssetBlockPeriod({
          participationPeriod,
          acceptedBeforeBufferMinutes: buffer.beforeBufferMinutes,
          acceptedAfterBufferMinutes: buffer.afterBufferMinutes,
          acceptedDelivery: this.resolveAcceptedDelivery(rental.acceptedDeliverySnapshot),
          ...(clampStartAt ? { clampStartAt } : {}),
        })
      : deriveBufferedAssetBlockPeriod({
          participationPeriod,
          ...buffer,
          ...(clampStartAt ? { clampStartAt } : {}),
        });

    const blockedAssetIds = await this.findBlockedAssetIds({
      tenantId: query.tenantId,
      rentalId: rental.id,
      assetIds: inventory.eligibleAssets.map((asset) => asset.assetId),
      period: operationalPeriod.toPostgresRange(),
    });
    const availableCountByEquipmentType = new Map<string, number>();
    for (const asset of inventory.eligibleAssets) {
      if (blockedAssetIds.has(asset.assetId)) continue;
      availableCountByEquipmentType.set(
        asset.equipmentTypeId,
        (availableCountByEquipmentType.get(asset.equipmentTypeId) ?? 0) + 1,
      );
    }

    const defaultsBySourceEquipmentTypeId = new Map<string, typeof inventory.defaults>();
    for (const item of inventory.defaults) {
      const values = defaultsBySourceEquipmentTypeId.get(item.sourceEquipmentTypeId) ?? [];
      values.push(item);
      defaultsBySourceEquipmentTypeId.set(item.sourceEquipmentTypeId, values);
    }

    return ok({
      rentalOrderId: rental.id,
      suggestions: rental.demandLines.flatMap((line) =>
        (defaultsBySourceEquipmentTypeId.get(line.equipmentTypeId) ?? []).map((item) => ({
          sourceRentalDemandLineId: line.id,
          sourceEquipmentTypeId: line.equipmentTypeId,
          sourceEquipmentTypeName: line.equipmentTypeNameSnapshot,
          accessoryEquipmentTypeId: item.accessoryEquipmentTypeId,
          accessoryEquipmentTypeName: item.accessoryEquipmentTypeName,
          quantityPerUnit: item.quantityPerUnit,
          sourceQuantity: line.quantity,
          recommendedQuantity: item.quantityPerUnit * line.quantity,
          availableCount: availableCountByEquipmentType.get(item.accessoryEquipmentTypeId) ?? 0,
        })),
      ),
    });
  }

  private resolveAcceptedDelivery(snapshot: Prisma.JsonValue | null): AcceptedDeliverySnapshot | undefined {
    if (snapshot === null) return undefined;
    const acceptedDelivery = AcceptedDeliverySnapshot.create(snapshot as JsonValue);
    if (acceptedDelivery.isErr()) throw acceptedDelivery.error;
    return acceptedDelivery.value;
  }

  private resolveAcceptedBuffer(before: number | null, after: number | null) {
    if (before === null || after === null) {
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    }
    return { beforeBufferMinutes: before, afterBufferMinutes: after };
  }

  private async resolveCurrentBuffer(tenantId: string) {
    const result = await this.tenantBufferSettings.getTenantRentalAssetBufferSettings({ tenantId });
    if (result.isErr()) throw result.error;
    return result.value;
  }

  private async findBlockedAssetIds(params: {
    tenantId: string;
    rentalId: string;
    assetIds: readonly string[];
    period: string;
  }): Promise<Set<string>> {
    if (params.assetIds.length === 0) return new Set();
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
}
