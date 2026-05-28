import { QueryBus } from '@nestjs/cqrs';
import {
  BookingMode,
  CreateOrderNextStepType,
  FulfillmentMethod,
  OrderAssignmentStage,
  OrderCommunicationMode,
  OrderItemType,
  OrderStatus,
  ScheduleSlotType,
} from '@repo/types';
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
import {
  IdempotencyKeyConflictError,
  IdempotencyKeyInProgressError,
} from './idempotency/create-order-idempotency.errors';
import { CreateOrderIdempotencyPreflightKind } from './idempotency/create-order-idempotency.constants';
import { CreateOrderAssetResolver } from './inventory/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from './ownership/create-order-owner-contract-resolver';
import { CreateOrderService } from './create-order.service';
import { OrderMustContainItemsError } from '../../../domain/errors/order.errors';

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

  function makeService(
    bookingMode: BookingMode,
    orderCommunicationMode: OrderCommunicationMode = OrderCommunicationMode.FORMAL,
  ) {
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

    const transactionClient = {};
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(transactionClient)),
        order: {
          findFirst: jest.fn(async () => ({
            id: 'order-1',
            status: savedStatus ?? OrderStatus.CONFIRMED,
            orderNumber: 1001,
            bookingSnapshot: {
              pickupDate: '2026-03-30',
              pickupTime: 600,
              returnDate: '2026-03-31',
              returnTime: 900,
              timezone: 'UTC',
            },
            fulfillmentMethod: FulfillmentMethod.PICKUP,
            financialSnapshot: {
              currency: 'ARS',
              subtotalBeforeDiscounts: '100',
              itemsDiscountTotal: '0',
              itemsSubtotal: '100',
              insuranceApplied: false,
              insuranceRatePercent: 6,
              insuranceAmount: '0',
              total: '100',
            },
            customer: {
              firstName: 'John',
              lastName: 'Doe',
            },
            location: {
              name: 'Main Branch',
            },
            deliveryRequest: null,
            items: [
              {
                type: OrderItemType.PRODUCT,
                productType: {
                  name: 'Product 1',
                },
                bundle: null,
              },
            ],
          })),
        },
      },
    } as unknown as PrismaService;

    const queryBus = {
      execute: jest.fn(async (query: { constructor: { name: string }; type?: ScheduleSlotType }) => {
        if (query.constructor.name === 'GetTenantConfigQuery') {
          return {
            timezone: 'UTC',
            bookingMode,
            communication: {
              orderCommunicationMode,
              whatsAppNumber: '34680870274',
              showFloatingWhatsAppButton: false,
            },
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
    const emitAsyncSpy = jest.spyOn(eventEmitter, 'emitAsync');

    const idempotency = {
      complete: jest.fn(async () => ok(undefined)),
      release: jest.fn(async () => ok(undefined)),
    };
    const idempotencyPreflight = {
      run: jest.fn<
        Promise<
          | { kind: CreateOrderIdempotencyPreflightKind.STARTED; recordId: string }
          | { kind: CreateOrderIdempotencyPreflightKind.REPLAY; orderId: string }
          | { kind: CreateOrderIdempotencyPreflightKind.ERROR; error: Error }
        >,
        [CreateOrderCommand]
      >(async () => ({
        kind: CreateOrderIdempotencyPreflightKind.STARTED,
        recordId: 'idempotency-record-1',
      })),
    };

    const service = new CreateOrderService(
      eventEmitter,
      prisma,
      queryBus,
      orderRepository,
      pricingApi,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
      idempotency as never,
      idempotencyPreflight as never,
    );

    return {
      service,
      saved: () => ({ savedStatus, savedPeriod, savedBookingSnapshot, savedAssignments }),
      prisma,
      queryBus,
      orderRepository,
      pricingApi,
      inventoryApi,
      assetResolver,
      ownerContractResolver,
      eventEmitter,
      emitAsyncSpy,
      idempotency,
      idempotencyPreflight,
      transactionClient,
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
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
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
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174001',
    });
  }

  it('creates confirmed orders for instant-book tenants', async () => {
    const { service, saved, idempotency, idempotencyPreflight, emitAsyncSpy, transactionClient } = makeService(
      BookingMode.INSTANT_BOOK,
    );

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      orderId: expect.any(String),
      status: OrderStatus.CONFIRMED,
      nextStep: {
        type: CreateOrderNextStepType.SHOW_CONFIRMATION,
      },
    });
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
    expect(idempotencyPreflight.run).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
    expect(idempotency.complete).toHaveBeenCalledWith('idempotency-record-1', expect.any(String), transactionClient);
    expect(idempotency.release).not.toHaveBeenCalled();
    expect(emitAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it('creates pending review orders for request-to-book tenants without assignments', async () => {
    const { service, saved } = makeService(BookingMode.REQUEST_TO_BOOK);

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      orderId: expect.any(String),
      status: OrderStatus.PENDING_REVIEW,
      nextStep: {
        type: CreateOrderNextStepType.SHOW_CONFIRMATION,
      },
    });
    expect(saved().savedStatus).toBe(OrderStatus.PENDING_REVIEW);
    expect(saved().savedAssignments).toEqual([]);
  });

  it('returns a WhatsApp redirect next step for WhatsApp tenants', async () => {
    const { service } = makeService(BookingMode.INSTANT_BOOK, OrderCommunicationMode.WHATSAPP);

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().nextStep).toEqual({
      type: CreateOrderNextStepType.REDIRECT_TO_WHATSAPP,
      message: expect.stringContaining('Pedido N° 1001'),
      whatsappUrl: expect.stringContaining('https://wa.me/34680870274?text='),
    });
  });

  it('returns a persisted order response for completed idempotency replays without creating side effects', async () => {
    const {
      service,
      prisma,
      pricingApi,
      orderRepository,
      inventoryApi,
      idempotency,
      idempotencyPreflight,
      emitAsyncSpy,
    } = makeService(BookingMode.INSTANT_BOOK);
    idempotencyPreflight.run.mockResolvedValueOnce({
      kind: CreateOrderIdempotencyPreflightKind.REPLAY,
      orderId: 'order-1',
    });

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      orderId: 'order-1',
      status: OrderStatus.CONFIRMED,
      nextStep: {
        type: CreateOrderNextStepType.SHOW_CONFIRMATION,
      },
    });
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
    expect(pricingApi.priceBasket).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(inventoryApi.saveOrderAssignment).not.toHaveBeenCalled();
    expect(idempotency.complete).not.toHaveBeenCalled();
    expect(idempotency.release).not.toHaveBeenCalled();
    expect(emitAsyncSpy).not.toHaveBeenCalled();
  });

  it('preserves WhatsApp next step responses for completed idempotency replays', async () => {
    const { service, idempotencyPreflight, emitAsyncSpy } = makeService(
      BookingMode.INSTANT_BOOK,
      OrderCommunicationMode.WHATSAPP,
    );
    idempotencyPreflight.run.mockResolvedValueOnce({
      kind: CreateOrderIdempotencyPreflightKind.REPLAY,
      orderId: 'order-1',
    });

    const result = await service.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().nextStep).toEqual({
      type: CreateOrderNextStepType.REDIRECT_TO_WHATSAPP,
      message: expect.stringContaining('Pedido N° 1001'),
      whatsappUrl: expect.stringContaining('https://wa.me/34680870274?text='),
    });
    expect(emitAsyncSpy).not.toHaveBeenCalled();
  });

  it('returns idempotency conflicts without creating side effects', async () => {
    const { service, prisma, pricingApi, orderRepository, idempotencyPreflight, emitAsyncSpy } = makeService(
      BookingMode.INSTANT_BOOK,
    );
    idempotencyPreflight.run.mockResolvedValueOnce({
      kind: CreateOrderIdempotencyPreflightKind.ERROR,
      error: new IdempotencyKeyConflictError(),
    });

    const result = await service.execute(makeCommand());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(IdempotencyKeyConflictError);
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
    expect(pricingApi.priceBasket).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(emitAsyncSpy).not.toHaveBeenCalled();
  });

  it('returns in-progress idempotency errors without creating side effects', async () => {
    const { service, prisma, pricingApi, orderRepository, idempotencyPreflight, emitAsyncSpy } = makeService(
      BookingMode.INSTANT_BOOK,
    );
    idempotencyPreflight.run.mockResolvedValueOnce({
      kind: CreateOrderIdempotencyPreflightKind.ERROR,
      error: new IdempotencyKeyInProgressError(),
    });

    const result = await service.execute(makeCommand());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(IdempotencyKeyInProgressError);
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
    expect(pricingApi.priceBasket).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(emitAsyncSpy).not.toHaveBeenCalled();
  });

  it('rejects delivery orders for locations that do not support delivery and releases the idempotency record', async () => {
    const { service, idempotency } = makeService(BookingMode.INSTANT_BOOK);

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
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
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
    expect(idempotency.release).toHaveBeenCalledWith('idempotency-record-1');
  });

  it('rejects empty orders and releases the idempotency record', async () => {
    const { service, pricingApi, orderRepository, idempotency, emitAsyncSpy } = makeService(BookingMode.INSTANT_BOOK);

    const result = await service.execute(
      new CreateOrderCommand({
        tenantId: 'tenant-1',
        locationId: 'location-1',
        customerId: 'customer-1',
        pickupDate: '2026-03-30',
        returnDate: '2026-03-31',
        pickupTime: 600,
        returnTime: 900,
        items: [],
        currency: 'ARS',
        insuranceSelected: false,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174003',
      }),
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OrderMustContainItemsError);
    expect(idempotency.release).toHaveBeenCalledWith('idempotency-record-1');
    expect(pricingApi.priceBasket).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(emitAsyncSpy).not.toHaveBeenCalled();
  });

  it('ignores insurance selection when tenant insurance is disabled', async () => {
    const { service } = makeService(BookingMode.INSTANT_BOOK);

    const result = await service.execute(makeInsuranceCommand());

    expect(result.isOk()).toBe(true);
  });
});
