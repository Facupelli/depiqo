import { QueryBus } from '@nestjs/cqrs';
import { FulfillmentMethod, OrderAssignmentStage, OrderStatus } from '@repo/types';
import { ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { Money } from 'src/core/domain/value-objects/money.value-object';
import { CreateOrderAssetResolver } from 'src/modules/order/application/commands/create-order/inventory/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from 'src/modules/order/application/commands/create-order/ownership/create-order-owner-contract-resolver';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { DraftOrderPricingService } from 'src/modules/order/domain/services/draft-order-pricing.service';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { PricingPublicApi } from 'src/modules/pricing/pricing.public-api';

import { EditOrderCommand } from './edit-order.command';
import { EditOrderService } from './edit-order.service';

describe('EditOrderService', () => {
  const period = DateRange.create(new Date('2099-04-01T10:00:00.000Z'), new Date('2099-04-02T15:00:00.000Z'));

  function makePricingResult(amount: number) {
    return {
      basePrice: Money.of(amount, 'ARS'),
      finalPrice: Money.of(amount, 'ARS'),
      pricePerBillingUnit: Money.of(amount, 'ARS'),
      totalUnits: 1,
      appliedAdjustments: [],
    };
  }

  function makeOrder(status: OrderStatus, options?: { reviewedAt?: Date; reviewedByUserId?: string }) {
    return Order.create({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      currency: 'ARS',
      customerId: 'customer-old',
      period,
      status,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
      bookingSnapshot: BookingSnapshot.create({
        pickupDate: '2099-04-01',
        pickupTime: 600,
        returnDate: '2099-04-02',
        returnTime: 900,
        timezone: 'UTC',
      }),
      insuranceSelected: false,
      insuranceRatePercent: 0,
      notes: 'keep me',
      reviewedAt: options?.reviewedAt,
      reviewedByUserId: options?.reviewedByUserId,
    });
  }

  function makeService(existingOrder: Order, options?: { quantity?: number }) {
    let savedOrder: Order | null = null;

    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
      },
    } as unknown as PrismaService;

    const queryBus = {
      execute: jest.fn(async (query: { constructor: { name: string } }) => {
        if (query.constructor.name === 'GetOrderSigningSummaryQuery') {
          return { status: 'NOT_SIGNED' };
        }

        if (query.constructor.name === 'GetTenantConfigQuery') {
          return {
            pricing: {
              insuranceEnabled: false,
              insuranceRatePercent: 6,
            },
          };
        }

        if (query.constructor.name === 'GetLocationContextQuery') {
          return { id: 'location-2', supportsDelivery: true, effectiveTimezone: 'UTC' };
        }
      }),
    } as unknown as QueryBus;

    const orderRepository = {
      load: jest.fn(async () => existingOrder),
      save: jest.fn(async (order: Order) => {
        savedOrder = order;
        return order.id;
      }),
    } as unknown as OrderRepository;

    const pricingApi = {
      priceBasket: jest.fn(async () => ({
        items: [
          {
            type: 'PRODUCT' as const,
            productTypeId: 'product-2',
            quantity: options?.quantity ?? 1,
            locationId: 'location-2',
            period,
            currency: 'ARS',
            price: makePricingResult(150),
          },
        ],
        couponApplied: false,
        orderSubtotalBeforePromotions: 150,
        itemsSubtotal: 150,
        totalBeforeDiscounts: 150,
        totalDiscount: 0,
      })),
    } as unknown as PricingPublicApi;

    const inventoryApi = {
      releaseOrderAssignments: jest.fn(async () => undefined),
      saveOrderAssignment: jest.fn(async () => ok(undefined)),
    } as any;

    const assetResolver = {
      resolveDemand: jest.fn(async (demandUnits: Array<{ resolvedAssetId?: string }>) => {
        demandUnits.forEach((unit, index) => {
          unit.resolvedAssetId = `asset-${index + 1}`;
        });

        return {
          unavailableItems: [],
          conflictGroups: [],
        };
      }),
    } as unknown as CreateOrderAssetResolver;

    const ownerContractResolver = {
      resolve: jest.fn(async () => new Map()),
    } as unknown as CreateOrderOwnerContractResolver;

    return {
      service: new EditOrderService(
        prisma,
        queryBus,
        orderRepository,
        pricingApi,
        new DraftOrderPricingService(),
        inventoryApi,
        assetResolver,
        ownerContractResolver,
      ),
      saved: () => savedOrder,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
    };
  }

  function makeCommand(orderId: string, quantity = 1) {
    return new EditOrderCommand({
      tenantId: 'tenant-1',
      orderId,
      locationId: 'location-2',
      customerId: 'customer-new',
      pickupDate: '2099-04-10',
      returnDate: '2099-04-12',
      pickupTime: 600,
      returnTime: 1020,
      items: [{ type: 'PRODUCT', productTypeId: 'product-2', quantity }],
      currency: 'ARS',
      insuranceSelected: false,
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      deliveryRequest: {
        recipientName: 'Jane Client',
        phone: '123',
        addressLine1: 'Main 1',
        city: 'Cordoba',
        stateRegion: 'Cordoba',
        postalCode: '5000',
        country: 'AR',
      },
      setByUserId: 'user-1',
    });
  }

  it('edits pending-review orders without inventory side effects', async () => {
    const existingOrder = makeOrder(OrderStatus.PENDING_REVIEW);
    const { service, saved, inventoryApi, assetResolver, ownerContractResolver } = makeService(existingOrder, {
      quantity: 2,
    });

    const result = await service.execute(makeCommand(existingOrder.id, 2));

    expect(result.isOk()).toBe(true);
    expect(inventoryApi.releaseOrderAssignments).not.toHaveBeenCalled();
    expect(assetResolver.resolveDemand).not.toHaveBeenCalled();
    expect(ownerContractResolver.resolve).not.toHaveBeenCalled();
    expect(inventoryApi.saveOrderAssignment).not.toHaveBeenCalled();
    expect(saved()?.locationId).toBe('location-2');
    expect(saved()?.customerId).toBe('customer-new');
    expect(saved()?.currentFulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
    expect(saved()?.currentDeliveryRequest?.toJSON()).toMatchObject({ recipientName: 'Jane Client' });
    expect(saved()?.getItems()).toHaveLength(2);
    expect(
      saved()
        ?.getItems()
        .every((item) => item.ownerSplits.length === 0),
    ).toBe(true);
  });

  it('preserves confirmed edit assignment behavior and review metadata', async () => {
    const reviewedAt = new Date('2099-03-01T10:00:00.000Z');
    const existingOrder = makeOrder(OrderStatus.CONFIRMED, { reviewedAt, reviewedByUserId: 'reviewer-1' });
    const { service, saved, inventoryApi, assetResolver, ownerContractResolver } = makeService(existingOrder);

    const result = await service.execute(makeCommand(existingOrder.id));

    expect(result.isOk()).toBe(true);
    expect(inventoryApi.releaseOrderAssignments).toHaveBeenCalledWith(
      existingOrder.id,
      OrderAssignmentStage.COMMITTED,
      expect.anything(),
    );
    expect(assetResolver.resolveDemand).toHaveBeenCalledTimes(1);
    expect(ownerContractResolver.resolve).toHaveBeenCalledTimes(1);
    expect(inventoryApi.saveOrderAssignment).toHaveBeenCalledTimes(1);
    expect(saved()?.currentReviewedAt).toEqual(reviewedAt);
    expect(saved()?.currentReviewedByUserId).toBe('reviewer-1');
  });
});
