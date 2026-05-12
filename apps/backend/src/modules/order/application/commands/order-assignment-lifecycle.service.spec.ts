import {
  ContractBasis,
  FulfillmentMethod,
  OrderAssignmentStage,
  OrderItemType,
  OrderStatus,
  PricingAdjustmentSourceKind,
  PromotionAdjustmentType,
} from '@repo/types';
import { EventEmitter2 } from 'eventemitter2';
import { ConfirmOrderService } from './confirm-order/confirm-order.service';
import { ConfirmDraftOrderFlow } from './confirm-order/confirm-draft-order.flow';
import { ConfirmPendingReviewOrderFlow } from './confirm-order/confirm-pending-review-order.flow';
import { RejectOrderService } from './reject-order/reject-order.service';
import { CancelOrderService } from './cancel-order/cancel-order.service';
import { ExpireOrderService } from './expire-order/expire-order.service';
import { ConfirmOrderCommand } from './confirm-order/confirm-order.command';
import { RejectOrderCommand } from './reject-order/reject-order.command';
import { CancelOrderCommand } from './cancel-order/cancel-order.command';
import { ExpireOrderCommand } from './expire-order/expire-order.command';
import { OrderRepository } from '../../infrastructure/persistence/repositories/order.repository';
import { PrismaService } from 'src/core/database/prisma.service';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import { PricingPublicApi } from 'src/modules/pricing/pricing.public-api';
import { Order } from '../../domain/entities/order.entity';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { BookingSnapshot } from '../../domain/value-objects/booking-snapshot.value-object';
import Decimal from 'decimal.js';
import { PriceSnapshot } from '../../domain/value-objects/price-snapshot.value-object';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { OrderItemOwnerSplit, SplitStatus } from '../../domain/entities/order-item-owner-split.entity';
import { OrderFinancialSnapshot } from '../../domain/value-objects/order-financial-snapshot.value-object';
import {
  OrderCancellationBlockedBySettledOwnerSplitsError,
  OrderCustomerRequiredForConfirmationError,
} from '../../domain/errors/order.errors';
import { CreateOrderAssetResolver } from './create-order/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from './create-order/create-order-owner-contract-resolver';
import { ok } from 'neverthrow';

function makeOrder(status: OrderStatus): Order {
  return Order.create({
    tenantId: 'tenant-1',
    locationId: 'location-1',
    currency: 'ARS',
    customerId: 'customer-1',
    period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
    status,
    fulfillmentMethod: FulfillmentMethod.PICKUP,
    bookingSnapshot: BookingSnapshot.create({
      pickupDate: '2026-03-30',
      pickupTime: 600,
      returnDate: '2026-03-31',
      returnTime: 600,
      timezone: 'UTC',
    }),
    insuranceSelected: false,
    insuranceRatePercent: 0,
  });
}

function makeOrderWithSplit(orderStatus: OrderStatus, splitStatus: SplitStatus): Order {
  return Order.reconstitute({
    id: 'order-with-split',
    tenantId: 'tenant-1',
    locationId: 'location-1',
    customerId: 'customer-1',
    period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
    status: orderStatus,
    fulfillmentMethod: FulfillmentMethod.PICKUP,
    deliveryRequest: null,
    bookingSnapshot: BookingSnapshot.reconstitute({
      pickupDate: '2026-03-30',
      pickupTime: 600,
      returnDate: '2026-03-31',
      returnTime: 600,
      timezone: 'UTC',
    }),
    insuranceSelected: false,
    financialSnapshot: OrderFinancialSnapshot.zero('ARS', false, 0),
    notes: null,
    items: [
      OrderItem.reconstitute({
        id: 'item-1',
        orderId: 'order-with-split',
        type: OrderItemType.PRODUCT,
        priceSnapshot: PriceSnapshot.create({
          currency: 'ARS',
          basePrice: new Decimal(100),
          finalPrice: new Decimal(100),
          totalUnits: 1,
          pricePerBillingUnit: new Decimal(100),
          discounts: [],
        }),
        manualPricingOverride: null,
        productTypeId: 'product-type-1',
        bundleId: null,
        bundleSnapshot: null,
        ownerSplits: [
          OrderItemOwnerSplit.reconstitute({
            id: 'split-1',
            orderItemId: 'item-1',
            assetId: 'asset-1',
            ownerId: 'owner-1',
            contractId: 'contract-1',
            status: splitStatus,
            ownerShare: new Decimal(0.7),
            rentalShare: new Decimal(0.3),
            basis: ContractBasis.NET_COLLECTED,
            grossAmount: new Decimal(100),
            netAmount: new Decimal(100),
            ownerAmount: new Decimal(70),
            rentalAmount: new Decimal(30),
          }),
        ],
      }),
    ],
  });
}

function makeTransactionPrisma() {
  return {
    client: {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
    },
  } as unknown as PrismaService;
}

describe('Order assignment lifecycle services', () => {
  it('confirm approves pending-review orders by creating committed assignments and review metadata', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrder(OrderStatus.PENDING_REVIEW);
    order.addItem(
      OrderItem.create({
        orderId: order.id,
        type: OrderItemType.PRODUCT,
        productTypeId: 'product-type-1',
        priceSnapshot: PriceSnapshot.create({
          currency: 'ARS',
          basePrice: new Decimal(100),
          finalPrice: new Decimal(100),
          totalUnits: 1,
          pricePerBillingUnit: new Decimal(100),
          discounts: [],
        }),
      }),
    );

    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      saveOrderAssignment: jest.fn(async () => ok(undefined)),
    } as unknown as InventoryPublicApi;
    const assetResolver = {
      resolveDemand: jest.fn(async (demandUnits) => {
        demandUnits[0].resolvedAssetId = 'asset-1';
        return { unavailableItems: [], conflictGroups: [] };
      }),
    } as unknown as CreateOrderAssetResolver;
    const ownerContractResolver = {
      resolve: jest.fn(async () => new Map()),
    } as unknown as CreateOrderOwnerContractResolver;
    const eventEmitter = {
      emitAsync: jest.fn(async () => []),
    } as unknown as EventEmitter2;
    const pendingReviewFlow = new ConfirmPendingReviewOrderFlow(
      eventEmitter,
      prisma,
      orderRepository,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
    );
    const draftFlow = {
      execute: jest.fn(),
    } as unknown as ConfirmDraftOrderFlow;

    const service = new ConfirmOrderService(orderRepository, pendingReviewFlow, draftFlow);
    const result = await service.execute(new ConfirmOrderCommand('tenant-1', order.id, 'user-1'));

    expect(result.isOk()).toBe(true);
    expect(order.currentStatus).toBe(OrderStatus.CONFIRMED);
    expect(order.currentReviewedByUserId).toBe('user-1');
    expect(order.currentReviewedAt).toBeInstanceOf(Date);
    expect(orderRepository.save).toHaveBeenCalled();
    expect(inventoryApi.saveOrderAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-1',
        orderId: order.id,
        orderItemId: order.getItems()[0].id,
        stage: OrderAssignmentStage.COMMITTED,
      }),
      { tx: true },
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalled();
  });

  it('confirm leaves pending-review orders unchanged when approval availability fails', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrder(OrderStatus.PENDING_REVIEW);
    order.addItem(
      OrderItem.create({
        orderId: order.id,
        type: OrderItemType.PRODUCT,
        productTypeId: 'product-type-1',
        priceSnapshot: PriceSnapshot.create({
          currency: 'ARS',
          basePrice: new Decimal(100),
          finalPrice: new Decimal(100),
          totalUnits: 1,
          pricePerBillingUnit: new Decimal(100),
          discounts: [],
        }),
      }),
    );

    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      saveOrderAssignment: jest.fn(async () => ok(undefined)),
    } as unknown as InventoryPublicApi;
    const assetResolver = {
      resolveDemand: jest.fn(async () => ({
        unavailableItems: [{ type: 'PRODUCT' as const, productTypeId: 'product-type-1' }],
        conflictGroups: [],
      })),
    } as unknown as CreateOrderAssetResolver;
    const ownerContractResolver = {
      resolve: jest.fn(async () => new Map()),
    } as unknown as CreateOrderOwnerContractResolver;
    const eventEmitter = {
      emitAsync: jest.fn(async () => []),
    } as unknown as EventEmitter2;
    const pendingReviewFlow = new ConfirmPendingReviewOrderFlow(
      eventEmitter,
      prisma,
      orderRepository,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
    );
    const draftFlow = {
      execute: jest.fn(),
    } as unknown as ConfirmDraftOrderFlow;

    const service = new ConfirmOrderService(orderRepository, pendingReviewFlow, draftFlow);
    const result = await service.execute(new ConfirmOrderCommand('tenant-1', order.id, 'user-1'));

    expect(result.isErr()).toBe(true);
    expect(order.currentStatus).toBe(OrderStatus.PENDING_REVIEW);
    expect(order.currentReviewedAt).toBeNull();
    expect(order.currentReviewedByUserId).toBeNull();
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(inventoryApi.saveOrderAssignment).not.toHaveBeenCalled();
    expect(ownerContractResolver.resolve).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('confirm requires a customer for draft orders', async () => {
    const prisma = makeTransactionPrisma();
    const order = Order.create({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      currency: 'ARS',
      period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
      status: OrderStatus.DRAFT,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
      bookingSnapshot: BookingSnapshot.create({
        pickupDate: '2026-03-30',
        pickupTime: 600,
        returnDate: '2026-03-31',
        returnTime: 600,
        timezone: 'UTC',
      }),
      insuranceSelected: false,
      insuranceRatePercent: 0,
    });
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      transitionOrderAssignmentsStage: jest.fn(async () => undefined),
      saveOrderAssignment: jest.fn(async () => ok(undefined)),
    } as unknown as InventoryPublicApi;
    const assetResolver = {
      resolveDemand: jest.fn(),
    } as unknown as CreateOrderAssetResolver;
    const ownerContractResolver = {
      resolve: jest.fn(),
    } as unknown as CreateOrderOwnerContractResolver;
    const pendingReviewFlow = {
      execute: jest.fn(),
    } as unknown as ConfirmPendingReviewOrderFlow;
    const draftFlow = new ConfirmDraftOrderFlow(prisma, orderRepository, inventoryApi, assetResolver, ownerContractResolver);

    const service = new ConfirmOrderService(orderRepository, pendingReviewFlow, draftFlow);
    const result = await service.execute(new ConfirmOrderCommand('tenant-1', order.id, 'user-1'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OrderCustomerRequiredForConfirmationError);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('confirm operationalizes draft orders with committed assignments and owner splits', async () => {
    const prisma = makeTransactionPrisma();
    const order = Order.create({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      currency: 'ARS',
      customerId: 'customer-1',
      period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
      status: OrderStatus.DRAFT,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
      bookingSnapshot: BookingSnapshot.create({
        pickupDate: '2026-03-30',
        pickupTime: 600,
        returnDate: '2026-03-31',
        returnTime: 600,
        timezone: 'UTC',
      }),
      insuranceSelected: false,
      insuranceRatePercent: 0,
    });
    order.addItem(
      OrderItem.create({
        orderId: order.id,
        type: OrderItemType.PRODUCT,
        productTypeId: 'product-type-1',
        priceSnapshot: PriceSnapshot.create({
          currency: 'ARS',
          basePrice: new Decimal(100),
          finalPrice: new Decimal(80),
          totalUnits: 1,
          pricePerBillingUnit: new Decimal(100),
          discounts: [
            {
              sourceKind: PricingAdjustmentSourceKind.PROMOTION,
              sourceId: 'promo-1',
              label: 'Manual discount',
              type: PromotionAdjustmentType.PERCENTAGE,
              value: 20,
              discountAmount: new Decimal(20),
            },
          ],
        }),
      }),
    );

    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      transitionOrderAssignmentsStage: jest.fn(async () => undefined),
      saveOrderAssignment: jest.fn(async () => ok(undefined)),
    } as unknown as InventoryPublicApi;
    const assetResolver = {
      resolveDemand: jest.fn(async (demandUnits) => {
        demandUnits[0].resolvedAssetId = 'asset-1';
        return { unavailableItems: [], conflictGroups: [] };
      }),
    } as unknown as CreateOrderAssetResolver;
    const ownerContractResolver = {
      resolve: jest.fn(
        async () =>
          new Map([
            [
              'asset-1',
              {
                ownerId: 'owner-1',
                contractId: 'contract-1',
                ownerShare: '0.7',
                rentalShare: '0.3',
                basis: ContractBasis.NET_COLLECTED,
              },
            ],
          ]),
      ),
    } as unknown as CreateOrderOwnerContractResolver;
    const pendingReviewFlow = {
      execute: jest.fn(),
    } as unknown as ConfirmPendingReviewOrderFlow;
    const draftFlow = new ConfirmDraftOrderFlow(prisma, orderRepository, inventoryApi, assetResolver, ownerContractResolver);

    const service = new ConfirmOrderService(orderRepository, pendingReviewFlow, draftFlow);
    const result = await service.execute(new ConfirmOrderCommand('tenant-1', order.id, 'user-1'));

    expect(result.isOk()).toBe(true);
    expect(order.currentStatus).toBe(OrderStatus.CONFIRMED);
    expect(order.getItems()[0].ownerSplits[0]?.ownerAmount.toString()).toBe('56');
    expect(inventoryApi.saveOrderAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-1',
        orderId: order.id,
        orderItemId: order.getItems()[0].id,
        stage: OrderAssignmentStage.COMMITTED,
      }),
      { tx: true },
    );
  });

  it('reject stores review metadata and does not release inventory', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrder(OrderStatus.PENDING_REVIEW);
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const eventEmitter = {
      emitAsync: jest.fn(async () => []),
    } as unknown as EventEmitter2;

    const service = new RejectOrderService(eventEmitter, prisma, orderRepository);
    const result = await service.execute(new RejectOrderCommand('tenant-1', order.id, 'user-1', 'Not available'));

    expect(result.isOk()).toBe(true);
    expect(order.currentStatus).toBe(OrderStatus.REJECTED);
    expect(order.currentReviewedByUserId).toBe('user-1');
    expect(order.currentReviewedAt).toBeInstanceOf(Date);
    expect(order.currentRejectionReason).toBe('Not available');
    expect(orderRepository.save).toHaveBeenCalled();
    expect(eventEmitter.emitAsync).toHaveBeenCalled();
  });

  it('expire releases hold assignments in the same transaction', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrder(OrderStatus.PENDING_REVIEW);
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      releaseOrderAssignments: jest.fn(async () => undefined),
    } as unknown as InventoryPublicApi;

    const service = new ExpireOrderService(prisma, orderRepository, inventoryApi);
    const result = await service.execute(new ExpireOrderCommand('tenant-1', order.id));

    expect(result.isOk()).toBe(true);
    expect(orderRepository.save).toHaveBeenCalled();
    expect(inventoryApi.releaseOrderAssignments).toHaveBeenCalledWith(order.id, OrderAssignmentStage.HOLD, {
      tx: true,
    });
  });

  it('cancel releases committed assignments in the same transaction', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrder(OrderStatus.CONFIRMED);
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      releaseOrderAssignments: jest.fn(async () => undefined),
    } as unknown as InventoryPublicApi;
    const pricingApi = {
      voidCouponRedemptionWithinTransaction: jest.fn(async () => undefined),
    } as unknown as PricingPublicApi;

    const service = new CancelOrderService(new EventEmitter2(), prisma, orderRepository, inventoryApi, pricingApi);
    const result = await service.execute(new CancelOrderCommand('tenant-1', order.id));

    expect(result.isOk()).toBe(true);
    expect(orderRepository.save).toHaveBeenCalled();
    expect(inventoryApi.releaseOrderAssignments).toHaveBeenCalledWith(order.id, OrderAssignmentStage.COMMITTED, {
      tx: true,
    });
    expect(pricingApi.voidCouponRedemptionWithinTransaction).toHaveBeenCalledWith(order.id, { tx: true });
  });

  it('cancel returns a domain error and skips persistence when owner payouts are settled', async () => {
    const prisma = makeTransactionPrisma();
    const order = makeOrderWithSplit(OrderStatus.CONFIRMED, SplitStatus.SETTLED);
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const inventoryApi = {
      releaseOrderAssignments: jest.fn(async () => undefined),
    } as unknown as InventoryPublicApi;
    const pricingApi = {
      voidCouponRedemptionWithinTransaction: jest.fn(async () => undefined),
    } as unknown as PricingPublicApi;

    const service = new CancelOrderService(new EventEmitter2(), prisma, orderRepository, inventoryApi, pricingApi);
    const result = await service.execute(new CancelOrderCommand('tenant-1', order.id));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OrderCancellationBlockedBySettledOwnerSplitsError);
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(inventoryApi.releaseOrderAssignments).not.toHaveBeenCalled();
    expect(pricingApi.voidCouponRedemptionWithinTransaction).not.toHaveBeenCalled();
  });
});
