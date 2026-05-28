import { FulfillmentMethod, OrderItemType, OrderStatus } from '@repo/types';
import Decimal from 'decimal.js';

import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import { DraftOrderPricingService } from 'src/modules/order/domain/services/draft-order-pricing.service';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { ManualPricingOverride } from 'src/modules/order/domain/value-objects/manual-pricing-override.value-object';
import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { OrderPricingAdjustmentNotAllowedError } from 'src/modules/order/domain/errors/order.errors';
import { UpdateDraftOrderPricingCommand } from './update-draft-order-pricing.command';
import { UpdateDraftOrderPricingService } from './update-draft-order-pricing.service';

function makeOrder(status: OrderStatus): Order {
  const order = Order.create({
    tenantId: 'tenant-1',
    locationId: 'location-1',
    currency: 'EUR',
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

  order.addItem(
    OrderItem.create({
      orderId: order.id,
      type: OrderItemType.PRODUCT,
      productTypeId: 'product-a',
      priceSnapshot: PriceSnapshot.create({
        currency: 'EUR',
        basePrice: new Decimal(300),
        finalPrice: new Decimal(300),
        totalUnits: 1,
        pricePerBillingUnit: new Decimal(300),
        discounts: [],
      }),
    }),
  );

  order.addItem(
    OrderItem.create({
      orderId: order.id,
      type: OrderItemType.PRODUCT,
      productTypeId: 'product-b',
      priceSnapshot: PriceSnapshot.create({
        currency: 'EUR',
        basePrice: new Decimal(300),
        finalPrice: new Decimal(300),
        totalUnits: 1,
        pricePerBillingUnit: new Decimal(300),
        discounts: [],
      }),
    }),
  );

  return order;
}

describe('UpdateDraftOrderPricingService', () => {
  it('stores manual overrides without rewriting the calculated snapshot', async () => {
    const order = makeOrder(OrderStatus.DRAFT);
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
      },
    } as unknown as PrismaService;
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const service = new UpdateDraftOrderPricingService(prisma, orderRepository, new DraftOrderPricingService());

    const result = await service.execute(
      new UpdateDraftOrderPricingCommand({
        tenantId: 'tenant-1',
        orderId: order.id,
        setByUserId: 'user-1',
        mode: 'TARGET_TOTAL',
        targetTotal: '400.00',
      }),
    );

    expect(result.isOk()).toBe(true);
    expect(order.currentFinancialSnapshot.itemsSubtotal.toFixed(2)).toBe('400.00');
    expect(order.getItems()[0].calculatedPriceSnapshot.finalPrice.toFixed(2)).toBe('300.00');
    expect(order.getItems()[0].manualPricingOverride?.finalPrice.toFixed(2)).toBe('200.00');
    expect(order.getItems()[0].manualPricingOverride?.setByUserId).toBe('user-1');
    expect(order.getItems()[0].manualPricingOverride?.setAt).toBeInstanceOf(Date);
    expect(order.getItems()[0].manualPricingOverride?.previousFinalPrice?.toFixed(2)).toBe('300.00');
    expect(orderRepository.save).toHaveBeenCalled();
  });

  it('rejects pricing updates for non-draft orders', async () => {
    const order = makeOrder(OrderStatus.CONFIRMED);
    const prisma = {
      client: {
        $transaction: jest.fn(),
      },
    } as unknown as PrismaService;
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(),
    } as unknown as OrderRepository;
    const service = new UpdateDraftOrderPricingService(prisma, orderRepository, new DraftOrderPricingService());

    const result = await service.execute(
      new UpdateDraftOrderPricingCommand({
        tenantId: 'tenant-1',
        orderId: order.id,
        setByUserId: 'user-1',
        mode: 'TARGET_TOTAL',
        targetTotal: '400.00',
      }),
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OrderPricingAdjustmentNotAllowedError);
  });

  it('allows target totals above the current draft subtotal and stores surcharge overrides', async () => {
    const order = makeOrder(OrderStatus.DRAFT);
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
      },
    } as unknown as PrismaService;
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(),
    } as unknown as OrderRepository;
    const service = new UpdateDraftOrderPricingService(prisma, orderRepository, new DraftOrderPricingService());

    const result = await service.execute(
      new UpdateDraftOrderPricingCommand({
        tenantId: 'tenant-1',
        orderId: order.id,
        setByUserId: 'user-1',
        mode: 'TARGET_TOTAL',
        targetTotal: '700.00',
      }),
    );

    expect(result.isOk()).toBe(true);
    expect(order.currentFinancialSnapshot.itemsSubtotal.toFixed(2)).toBe('700.00');
    expect(order.currentFinancialSnapshot.itemsDiscountTotal.toFixed(2)).toBe('-100.00');
    expect(order.getItems()[0].manualPricingOverride?.finalPrice.toFixed(2)).toBe('350.00');
    expect(order.getItems()[0].manualPricingOverride?.previousFinalPrice?.toFixed(2)).toBe('300.00');
  });

  it('stores previous effective price when replacing an existing override', async () => {
    const order = makeOrder(OrderStatus.DRAFT);
    order.replaceItemManualPricingOverride(
      order.getItems()[0].id,
      ManualPricingOverride.create({
        finalPrice: new Decimal(250),
        setByUserId: 'user-0',
        setAt: new Date('2026-04-24T10:00:00.000Z'),
        previousFinalPrice: new Decimal(300),
      }),
    );
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
      },
    } as unknown as PrismaService;
    const orderRepository = {
      load: jest.fn(async () => order),
      save: jest.fn(async () => order.id),
    } as unknown as OrderRepository;
    const service = new UpdateDraftOrderPricingService(prisma, orderRepository, new DraftOrderPricingService());

    const result = await service.execute(
      new UpdateDraftOrderPricingCommand({
        tenantId: 'tenant-1',
        orderId: order.id,
        setByUserId: 'user-2',
        mode: 'ITEMS',
        items: [
          { orderItemId: order.getItems()[0].id, finalPrice: '240.00' },
          { orderItemId: order.getItems()[1].id, finalPrice: '300.00' },
        ],
      }),
    );

    expect(result.isOk()).toBe(true);
    expect(order.getItems()[0].manualPricingOverride?.finalPrice.toFixed(2)).toBe('240.00');
    expect(order.getItems()[0].manualPricingOverride?.setByUserId).toBe('user-2');
    expect(order.getItems()[0].manualPricingOverride?.previousFinalPrice?.toFixed(2)).toBe('250.00');
  });
});
