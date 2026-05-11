import { QueryBus } from '@nestjs/cqrs';
import { BookingMode, FulfillmentMethod, OrderAssignmentStage, OrderStatus, ScheduleSlotType } from '@repo/types';
import Decimal from 'decimal.js';
import { EventEmitter2 } from 'eventemitter2';
import { ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { Money } from 'src/core/domain/value-objects/money.value-object';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { PricingPublicApi } from 'src/modules/pricing/pricing.public-api';
import { CreateOrderCommand } from './create-order.command';
import { CreateOrderAssetResolver } from './create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from './create-order-owner-contract-resolver';
import { CreateOrderService } from './create-order.service';

describe('CreateOrderService', () => {
  const period = DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T15:00:00.000Z'));

  function makePricingResult() {
    return {
      basePrice: Money.of(100, 'ARS'),
      finalPrice: Money.of(100, 'ARS'),
      pricePerBillingUnit: Money.of(100, 'ARS'),
      totalUnits: 1,
      appliedAdjustments: [],
    };
  }

  function makeService(bookingMode: BookingMode) {
    let savedStatus: OrderStatus | null = null;
    let savedPeriod: DateRange | null = null;
    let savedBookingSnapshot: {
      pickupDate: string;
      pickupTime: number;
      returnDate: string;
      returnTime: number;
      timezone: string;
    } | null = null;
    const savedAssignments: Array<{ stage: OrderAssignmentStage }> = [];

    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})),
        order: {
          findFirst: jest.fn(async () => ({ orderNumber: 'ORD-001' })),
        },
      },
    } as unknown as PrismaService;

    const queryBus = {
      execute: jest.fn(async (query: { constructor: { name: string }; type?: ScheduleSlotType }) => {
        if (query.constructor.name === 'GetTenantConfigQuery') {
          return {
            timezone: 'UTC',
            bookingMode,
            pricing: {
              insuranceEnabled: false,
              insuranceRatePercent: 6,
            },
          };
        }

        if (query.constructor.name === 'GetLocationContextQuery') {
          return { id: 'location-1', supportsDelivery: false, effectiveTimezone: 'UTC' };
        }

        return [600, 900];
      }),
    } as unknown as QueryBus;

    const orderRepository = {
      save: jest.fn(async (order) => {
        savedStatus = order.currentStatus;
        savedPeriod = order.currentPeriod;
        savedBookingSnapshot = {
          pickupDate: order.currentBookingSnapshot!.pickupDate,
          pickupTime: order.currentBookingSnapshot!.pickupTime,
          returnDate: order.currentBookingSnapshot!.returnDate,
          returnTime: order.currentBookingSnapshot!.returnTime,
          timezone: order.currentBookingSnapshot!.timezone,
        };
        expect(order.currentInsuranceSelected).toBe(false);
        expect(order.currentFinancialSnapshot.total.toString()).toBe('100');
        expect(order.currentFinancialSnapshot.insuranceAmount.toString()).toBe('0');
        return order.id;
      }),
    } as unknown as OrderRepository;

    const pricingApi = {
      priceBasket: jest.fn(async () => ({
        items: [
          {
            type: 'PRODUCT' as const,
            productTypeId: 'product-1',
            quantity: 1,
            locationId: 'location-1',
            period,
            currency: 'ARS',
            price: makePricingResult(),
          },
        ],
        couponApplied: false,
        orderSubtotalBeforePromotions: 100,
        itemsSubtotal: 100,
        totalBeforeDiscounts: 100,
        totalDiscount: 0,
      })),
      redeemCouponWithinTransaction: jest.fn(),
    } as unknown as PricingPublicApi;

    const inventoryApi = {
      saveOrderAssignment: jest.fn(async (assignment) => {
        savedAssignments.push({ stage: assignment.stage });
        return ok(undefined);
      }),
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
          new Map<
            string,
            {
              ownerId: string;
              contractId: string;
              ownerShare: Decimal;
              rentalShare: Decimal;
              basis: never;
            }
          >(),
      ),
    } as unknown as CreateOrderOwnerContractResolver;

    const eventEmitter = new EventEmitter2();

    const service = new CreateOrderService(
      eventEmitter,
      prisma,
      queryBus,
      orderRepository,
      pricingApi,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
    );

    return {
      service,
      saved: () => ({ savedStatus, savedPeriod, savedBookingSnapshot, savedAssignments }),
    };
  }

  function makeCommand() {
    return new CreateOrderCommand({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      customerId: 'customer-1',
      pickupDate: '2026-03-30',
      returnDate: '2026-03-31',
      pickupTime: 600,
      returnTime: 900,
      items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 }],
      currency: 'ARS',
      insuranceSelected: false,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
    });
  }

  function makeInsuranceCommand() {
    return new CreateOrderCommand({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      customerId: 'customer-1',
      pickupDate: '2026-03-30',
      returnDate: '2026-03-31',
      pickupTime: 600,
      returnTime: 900,
      items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 }],
      currency: 'ARS',
      insuranceSelected: true,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
    });
  }

  it('creates confirmed orders for instant-book tenants', async () => {
    const { service, saved } = makeService(BookingMode.INSTANT_BOOK);

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(saved().savedStatus).toBe(OrderStatus.CONFIRMED);
    expect(saved().savedPeriod?.equals(period)).toBe(true);
    expect(saved().savedBookingSnapshot).toEqual({
      pickupDate: '2026-03-30',
      pickupTime: 600,
      returnDate: '2026-03-31',
      returnTime: 900,
      timezone: 'UTC',
    });
    expect(saved().savedAssignments).toEqual([{ stage: OrderAssignmentStage.COMMITTED }]);
  });

  it('creates pending review orders for request-to-book tenants', async () => {
    const { service, saved } = makeService(BookingMode.REQUEST_TO_BOOK);

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(saved().savedStatus).toBe(OrderStatus.PENDING_REVIEW);
    expect(saved().savedAssignments).toEqual([{ stage: OrderAssignmentStage.HOLD }]);
  });

  it('rejects delivery orders for locations that do not support delivery', async () => {
    const { service } = makeService(BookingMode.INSTANT_BOOK);

    const result = await service.execute(
      new CreateOrderCommand({
        tenantId: 'tenant-1',
        locationId: 'location-1',
        customerId: 'customer-1',
        pickupDate: '2026-03-30',
        returnDate: '2026-03-31',
        pickupTime: 600,
        returnTime: 900,
        items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 }],
        currency: 'ARS',
        insuranceSelected: false,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        deliveryRequest: {
          recipientName: 'Jane Doe',
          phone: '+5491122334455',
          addressLine1: 'Av. Libertador 1234',
          city: 'Buenos Aires',
          stateRegion: 'Buenos Aires',
          postalCode: '1425',
          country: 'Argentina',
        },
      }),
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('does not support delivery');
  });

  it('ignores insurance selection when tenant insurance is disabled', async () => {
    const { service } = makeService(BookingMode.INSTANT_BOOK);

    const result = await service.execute(makeInsuranceCommand());

    expect(result.isOk()).toBe(true);
  });
});
