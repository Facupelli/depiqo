import { FulfillmentMethod, OrderItemType, OrderStatus } from '@repo/types';
import Decimal from 'decimal.js';

import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import { DraftOrderPricingService } from 'src/modules/order/domain/services/draft-order-pricing.service';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import {
  OrderPricingItemFinalPriceInvalidError,
  OrderPricingItemsPayloadMismatchError,
  OrderPricingTargetTotalInvalidError,
} from 'src/modules/order/domain/errors/order.errors';
function makeDraftOrder(): Order {
  const order = Order.create({
    tenantId: 'tenant-1',
    locationId: 'location-1',
    currency: 'EUR',
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
        basePrice: new Decimal(200),
        finalPrice: new Decimal(200),
        totalUnits: 1,
        pricePerBillingUnit: new Decimal(200),
        discounts: [],
      }),
    }),
  );

  order.addItem(
    OrderItem.create({
      orderId: order.id,
      type: OrderItemType.PRODUCT,
      productTypeId: 'product-c',
      priceSnapshot: PriceSnapshot.create({
        currency: 'EUR',
        basePrice: new Decimal(100),
        finalPrice: new Decimal(100),
        totalUnits: 1,
        pricePerBillingUnit: new Decimal(100),
        discounts: [],
      }),
    }),
  );

  return order;
}

describe('DraftOrderPricingService', () => {
  it('allocates target totals proportionally across order items', () => {
    const pricingService = new DraftOrderPricingService();
    const proposal = pricingService.proposeTargetTotal(makeDraftOrder(), new Decimal(400));

    expect(proposal.currentItemsSubtotal.toFixed(2)).toBe('600.00');
    expect(proposal.targetTotal.toFixed(2)).toBe('400.00');
    expect(proposal.items.map((item) => item.proposedFinalPrice.toFixed(2))).toEqual(['200.00', '133.33', '66.67']);
  });

  it('allows target totals above the current draft subtotal for surcharges', () => {
    const pricingService = new DraftOrderPricingService();
    const proposal = pricingService.proposeTargetTotal(makeDraftOrder(), new Decimal(700));

    expect(proposal.currentItemsSubtotal.toFixed(2)).toBe('600.00');
    expect(proposal.targetTotal.toFixed(2)).toBe('700.00');
    expect(proposal.proposedDiscountTotal.toFixed(2)).toBe('-100.00');
  });

  it('rejects non-positive target totals', () => {
    const pricingService = new DraftOrderPricingService();

    expect(() => pricingService.proposeTargetTotal(makeDraftOrder(), new Decimal(0))).toThrow(
      OrderPricingTargetTotalInvalidError,
    );
  });

  it('requires explicit item updates for every order item', () => {
    const pricingService = new DraftOrderPricingService();
    const order = makeDraftOrder();

    expect(() =>
      pricingService.buildFinalPriceMapFromItems(order, [
        { orderItemId: order.getItems()[0].id, finalPrice: '150.00' },
      ]),
    ).toThrow(OrderPricingItemsPayloadMismatchError);
  });

  it('rejects negative item final prices', () => {
    const pricingService = new DraftOrderPricingService();
    const order = makeDraftOrder();

    expect(() =>
      pricingService.buildFinalPriceMapFromItems(
        order,
        order.getItems().map((item, index) => ({
          orderItemId: item.id,
          finalPrice: index === 0 ? '-1.00' : item.effectiveFinalPrice.toFixed(2),
        })),
      ),
    ).toThrow(OrderPricingItemFinalPriceInvalidError);
  });
});
