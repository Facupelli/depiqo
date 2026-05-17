import { Injectable } from '@nestjs/common';

import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';

import { ConflictGroup, UnavailableItem } from '../../../../domain/errors/order.errors';
import { DemandUnit, ResolveDemandResult } from '../create-order.types';

@Injectable()
export class CreateOrderAssetResolver {
  constructor(private readonly inventoryApi: InventoryPublicApi) {}

  async resolveDemand(demandUnits: DemandUnit[], tx?: PrismaTransactionClient): Promise<ResolveDemandResult> {
    const groups = new Map<string, DemandUnit[]>();

    for (const unit of demandUnits) {
      const group = groups.get(unit.productTypeId) ?? [];
      group.push(unit);
      groups.set(unit.productTypeId, group);
    }

    const absoluteProvenances: DemandUnit['provenance'][] = [];
    const conflictGroups: ConflictGroup[] = [];

    for (const [productTypeId, units] of groups) {
      const pinnedUnits = units.filter((unit) => unit.pinnedAssetId != null);
      const freeUnits = units.filter((unit) => unit.pinnedAssetId == null);
      const { locationId, period } = units[0];
      const resolvedPinnedIds: string[] = [];

      for (const unit of pinnedUnits) {
        const ids = await this.inventoryApi.findAvailableAssetIds(
          {
            productTypeId,
            locationId,
            period,
            quantity: 1,
            assetId: unit.pinnedAssetId,
          },
          tx,
        );

        if (ids.length === 0) {
          absoluteProvenances.push(unit.provenance);
          continue;
        }

        unit.resolvedAssetId = ids[0];
        resolvedPinnedIds.push(ids[0]);
      }

      if (freeUnits.length === 0) {
        continue;
      }

      const ids = await this.inventoryApi.findAvailableAssetIds(
        {
          productTypeId,
          locationId,
          period,
          quantity: freeUnits.length,
          excludeAssetIds: resolvedPinnedIds,
        },
        tx,
      );

      if (ids.length < freeUnits.length) {
        const affectedProvenances = freeUnits.map((unit) => unit.provenance);

        if (ids.length === 0) {
          absoluteProvenances.push(...affectedProvenances);
        } else {
          conflictGroups.push({
            productTypeId,
            availableCount: ids.length,
            requestedCount: units.length,
            affectedItems: deduplicateProvenances(affectedProvenances),
          });
        }

        continue;
      }

      freeUnits.forEach((unit, index) => {
        unit.resolvedAssetId = ids[index];
      });
    }

    return {
      unavailableItems: deduplicateProvenances(absoluteProvenances),
      conflictGroups,
    };
  }
}

export function buildDemandUnits(resolvedItems: Array<DemandUnitSource>): DemandUnit[] {
  const units: DemandUnit[] = [];

  for (const item of resolvedItems) {
    if (item.type === 'PRODUCT') {
      for (let index = 0; index < item.quantity; index += 1) {
        units.push({
          productTypeId: item.productTypeId,
          locationId: item.locationId,
          period: item.period,
          pinnedAssetId: item.assetId,
          provenance: { type: 'PRODUCT', productTypeId: item.productTypeId },
        });
      }

      continue;
    }

    for (const component of item.bundle.components) {
      for (let index = 0; index < component.quantity; index += 1) {
        units.push({
          productTypeId: component.productTypeId,
          locationId: item.locationId,
          period: item.period,
          provenance: { type: 'BUNDLE', bundleId: item.bundleId },
        });
      }
    }
  }

  return units;
}

type DemandUnitSource =
  | {
      type: 'PRODUCT';
      productTypeId: string;
      quantity: number;
      assetId?: string;
      locationId: string;
      period: DemandUnit['period'];
    }
  | {
      type: 'BUNDLE';
      bundleId: string;
      bundle: { components: Array<{ productTypeId: string; quantity: number }> };
      locationId: string;
      period: DemandUnit['period'];
    };

function deduplicateProvenances(provenances: DemandUnit['provenance'][]): UnavailableItem[] {
  const seen = new Set<string>();
  const result: UnavailableItem[] = [];

  for (const provenance of provenances) {
    const key = provenance.type === 'PRODUCT' ? `PRODUCT:${provenance.productTypeId}` : `BUNDLE:${provenance.bundleId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(
      provenance.type === 'PRODUCT'
        ? { type: 'PRODUCT', productTypeId: provenance.productTypeId }
        : { type: 'BUNDLE', bundleId: provenance.bundleId },
    );
  }

  return result;
}
