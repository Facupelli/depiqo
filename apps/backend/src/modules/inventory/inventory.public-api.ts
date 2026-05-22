import { Result } from 'neverthrow';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { AssignmentSource, AssignmentType, OrderAssignmentStage } from '@repo/types';
import { AssetNotAvailableError } from './domain/errors/inventory.errors';
import { FindAvailableParams } from './inventory.contracts';

export type SaveOrderAssignmentDto = {
  assetId: string;
  period: DateRange;
  type: AssignmentType.ORDER;
  stage: OrderAssignmentStage;
  source: AssignmentSource;
  orderId: string;
  orderItemId?: string;
  orderItemAccessoryId?: string;
};

export type InventoryAssetSummary = {
  id: string;
  ownerId: string | null;
  productTypeId: string;
  locationId: string;
};

export abstract class InventoryPublicApi {
  abstract findAvailableAssetId(dto: FindAvailableParams, tx?: PrismaTransactionClient): Promise<string | null>;
  abstract findAvailableAssetIds(dto: FindAvailableParams, tx?: PrismaTransactionClient): Promise<string[]>;
  abstract findAssetById(tenantId: string, assetId: string): Promise<InventoryAssetSummary | null>;
  abstract saveOrderAssignment(
    dto: SaveOrderAssignmentDto,
    tx: PrismaTransactionClient,
  ): Promise<Result<void, AssetNotAvailableError>>;
  abstract transitionOrderAssignmentsStage(
    orderId: string,
    fromStage: OrderAssignmentStage,
    toStage: OrderAssignmentStage,
    tx: PrismaTransactionClient,
  ): Promise<void>;
  abstract releaseOrderAssignments(
    orderId: string,
    stage: OrderAssignmentStage,
    tx: PrismaTransactionClient,
  ): Promise<void>;
  abstract releaseOrderItemAccessoryAssignments(
    orderItemAccessoryId: string,
    tx: PrismaTransactionClient,
    options?: { keepCount?: number },
  ): Promise<void>;
}
