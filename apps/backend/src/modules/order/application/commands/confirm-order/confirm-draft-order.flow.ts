import { Injectable } from '@nestjs/common';
import { AssignmentSource, AssignmentType, OrderAssignmentStage } from '@repo/types';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';

import { CreateOrderAssetResolver, buildDemandUnits } from '../create-order/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from '../create-order/create-order-owner-contract-resolver';
import { DemandUnit } from '../create-order/create-order.types';
import { Order } from '../../../domain/entities/order.entity';
import { InvalidOrderStatusTransitionException } from '../../../domain/exceptions/order.exceptions';
import {
  NoActiveContractForAssetError,
  OrderCustomerRequiredForConfirmationError,
  OrderItemUnavailableError,
  OrderStatusTransitionNotAllowedError,
} from '../../../domain/errors/order.errors';

type ConfirmDraftOrderError =
  | NoActiveContractForAssetError
  | OrderCustomerRequiredForConfirmationError
  | OrderItemUnavailableError
  | OrderStatusTransitionNotAllowedError;

export type ConfirmOrderDemandUnit = DemandUnit & {
  orderItemId: string;
};

@Injectable()
export class ConfirmDraftOrderFlow {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepository: OrderRepository,
    private readonly inventoryApi: InventoryPublicApi,
    private readonly assetResolver: CreateOrderAssetResolver,
    private readonly ownerContractResolver: CreateOrderOwnerContractResolver,
  ) {}

  async execute(order: Order): Promise<Result<void, ConfirmDraftOrderError>> {
    if (!order.customerId) {
      return err(new OrderCustomerRequiredForConfirmationError(order.id));
    }

    const demandUnits = buildConfirmOrderDemandUnits(order);
    const availability = await this.assetResolver.resolveDemand(demandUnits);

    if (availability.unavailableItems.length > 0 || availability.conflictGroups.length > 0) {
      return err(new OrderItemUnavailableError(availability.unavailableItems, availability.conflictGroups));
    }

    try {
      order.confirm();
    } catch (error) {
      if (error instanceof InvalidOrderStatusTransitionException) {
        return err(new OrderStatusTransitionNotAllowedError(order.currentStatus, 'CONFIRMED' as never));
      }

      throw error;
    }

    const transactionResult = await this.prisma.client.$transaction(async (tx) => {
      const contractByAssetId = await this.ownerContractResolver.resolve(
        order.tenantId,
        order.currentPeriod.start,
        demandUnits,
      );
      const assignments = attachConfirmedDemandToOrder(order, demandUnits, contractByAssetId);

      await this.orderRepository.save(order, tx);
      const assignmentResults = await Promise.all(
        assignments.map((assignment) => this.inventoryApi.saveOrderAssignment(assignment, tx)),
      );

      if (assignmentResults.some((result) => result.isErr())) {
        return err(buildUnavailableError(demandUnits));
      }

      return ok(undefined);
    });

    if (transactionResult.isErr()) {
      return err(transactionResult.error);
    }

    return ok(undefined);
  }
}

export function buildConfirmOrderDemandUnits(order: Order): ConfirmOrderDemandUnit[] {
  const units: ConfirmOrderDemandUnit[] = [];

  for (const item of order.getItems()) {
    if (item.isProduct()) {
      const [unit] = buildDemandUnits([
        {
          type: 'PRODUCT' as const,
          productTypeId: item.productTypeId!,
          quantity: 1,
          locationId: order.locationId,
          period: order.currentPeriod,
        },
      ]);

      if (!unit) {
        throw new Error(`Draft product item "${item.id}" did not produce a demand unit.`);
      }

      units.push({
        ...unit,
        orderItemId: item.id,
      });
      continue;
    }

    for (const unit of buildDemandUnits([
      {
        type: 'BUNDLE' as const,
        bundleId: item.bundleId!,
        bundle: {
          components: item.bundleSnapshot!.components.map((component) => ({
            productTypeId: component.productTypeId,
            quantity: component.quantity,
          })),
        },
        locationId: order.locationId,
        period: order.currentPeriod,
      },
    ])) {
      units.push({ ...unit, orderItemId: item.id });
    }
  }

  return units;
}

export function attachConfirmedDemandToOrder(
  order: Order,
  demandUnits: ConfirmOrderDemandUnit[],
  contractByAssetId: Awaited<ReturnType<CreateOrderOwnerContractResolver['resolve']>>,
): Array<Parameters<InventoryPublicApi['saveOrderAssignment']>[0]> {
  const orderItemsById = new Map(order.getItems().map((item) => [item.id, item]));

  return demandUnits.map((unit) => {
    const orderItem = orderItemsById.get(unit.orderItemId);

    if (!orderItem || !unit.resolvedAssetId) {
      throw new Error(`Resolved draft demand for order item "${unit.orderItemId}" is incomplete.`);
    }

    const contract = contractByAssetId.get(unit.resolvedAssetId);
    if (contract) {
      orderItem.assignOwnerSplit({
        assetId: unit.resolvedAssetId,
        ownerId: contract.ownerId,
        contractId: contract.contractId,
        ownerShare: new Decimal(contract.ownerShare),
        rentalShare: new Decimal(contract.rentalShare),
        basis: contract.basis,
        productTypeId: unit.productTypeId,
      });
    }

    return {
      assetId: unit.resolvedAssetId,
      period: unit.period,
      type: AssignmentType.ORDER,
      stage: OrderAssignmentStage.COMMITTED,
      source: contract ? AssignmentSource.EXTERNAL : AssignmentSource.OWNED,
      orderId: order.id,
      orderItemId: unit.orderItemId,
    };
  });
}

export function buildUnavailableError(demandUnits: ConfirmOrderDemandUnit[]): OrderItemUnavailableError {
  const seen = new Set<string>();

  return new OrderItemUnavailableError(
    demandUnits.flatMap((unit) => {
      const key =
        unit.provenance.type === 'PRODUCT'
          ? `PRODUCT:${unit.provenance.productTypeId}`
          : `BUNDLE:${unit.provenance.bundleId}`;

      if (seen.has(key)) {
        return [];
      }

      seen.add(key);
      return [
        unit.provenance.type === 'PRODUCT'
          ? { type: 'PRODUCT' as const, productTypeId: unit.provenance.productTypeId }
          : { type: 'BUNDLE' as const, bundleId: unit.provenance.bundleId },
      ];
    }),
  );
}
