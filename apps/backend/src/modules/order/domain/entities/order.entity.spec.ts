import { ContractBasis, FulfillmentMethod, OrderItemType, OrderStatus } from '@repo/types';
import Decimal from 'decimal.js';

import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { OrderFinancialSnapshot } from '../value-objects/order-financial-snapshot.value-object';
import { OrderDeliveryRequest } from '../value-objects/order-delivery-request.value-object';
import { BookingSnapshot } from '../value-objects/booking-snapshot.value-object';
import { PriceSnapshot } from '../value-objects/price-snapshot.value-object';

import { Order } from './order.entity';
import { InvalidOrderStatusTransitionException } from '../exceptions/order.exceptions';
import { OrderItem } from './order-item.entity';
import { OrderItemOwnerSplit, SplitStatus } from './order-item-owner-split.entity';

function makeOrder(status: OrderStatus = OrderStatus.PENDING_REVIEW): Order {
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

function makeDeliveryRequest(): OrderDeliveryRequest {
  return OrderDeliveryRequest.create({
    recipientName: 'Jane Doe',
    phone: '+5491122334455',
    addressLine1: 'Av. Libertador 1234',
    city: 'Buenos Aires',
    stateRegion: 'Buenos Aires',
    postalCode: '1425',
    country: 'Argentina',
    instructions: 'Call before arrival',
  });
}

function makeReconstitutedOrder(status: OrderStatus = OrderStatus.PENDING_REVIEW): Order {
  return Order.reconstitute({
    id: 'order-1',
    tenantId: 'tenant-1',
    locationId: 'location-1',
    customerId: 'customer-1',
    period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
    status,
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
    items: [],
  });
}

function makeOrderItemWithSplit(status: SplitStatus): OrderItem {
  return OrderItem.reconstitute({
    id: 'item-1',
    orderId: 'order-1',
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
        status,
        ownerShare: new Decimal(0.7),
        rentalShare: new Decimal(0.3),
        basis: ContractBasis.NET_COLLECTED,
        grossAmount: new Decimal(100),
        netAmount: new Decimal(100),
        ownerAmount: new Decimal(70),
        rentalAmount: new Decimal(30),
      }),
    ],
  });
}

function makeOrderWithSplit(orderStatus: OrderStatus, splitStatus: SplitStatus): Order {
  return Order.reconstitute({
    id: 'order-1',
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
    items: [makeOrderItemWithSplit(splitStatus)],
  });
}

describe('Order', () => {
  it('confirms a pending review order', () => {
    const order = makeOrder();

    order.confirm();

    expect(order.currentStatus).toBe(OrderStatus.CONFIRMED);
  });

  it('confirms a draft order', () => {
    const order = makeOrder(OrderStatus.DRAFT);

    order.confirm();

    expect(order.currentStatus).toBe(OrderStatus.CONFIRMED);
  });

  it('rejects a pending review order', () => {
    const order = makeOrder();

    order.reject();

    expect(order.currentStatus).toBe(OrderStatus.REJECTED);
  });

  it('expires a pending review order', () => {
    const order = makeOrder();

    order.expire();

    expect(order.currentStatus).toBe(OrderStatus.EXPIRED);
  });

  it('cancels only confirmed orders', () => {
    const order = makeOrder(OrderStatus.CONFIRMED);

    order.cancel();

    expect(order.currentStatus).toBe(OrderStatus.CANCELLED);
  });

  it('cancels draft orders', () => {
    const order = makeOrder(OrderStatus.DRAFT);

    order.cancel();

    expect(order.currentStatus).toBe(OrderStatus.CANCELLED);
  });

  it('voids owner splits when cancelling a confirmed order', () => {
    const order = makeOrderWithSplit(OrderStatus.CONFIRMED, SplitStatus.PENDING);

    order.cancel();

    expect(order.getItems()[0].ownerSplits[0].status).toBe(SplitStatus.VOID);
    expect(order.currentStatus).toBe(OrderStatus.CANCELLED);
  });

  it('blocks cancelling orders with settled owner splits', () => {
    const order = makeOrderWithSplit(OrderStatus.CONFIRMED, SplitStatus.SETTLED);

    expect(() => order.cancel()).toThrow('Cannot cancel an order with settled owner splits.');
    expect(order.currentStatus).toBe(OrderStatus.CONFIRMED);
    expect(order.getItems()[0].ownerSplits[0].status).toBe(SplitStatus.SETTLED);
  });

  it('does not void owner splits when cancellation is not allowed by status', () => {
    const order = makeOrderWithSplit(OrderStatus.PENDING_REVIEW, SplitStatus.PENDING);

    expect(() => order.cancel()).toThrow(InvalidOrderStatusTransitionException);
    expect(order.getItems()[0].ownerSplits[0].status).toBe(SplitStatus.PENDING);
  });

  it('activates and completes a confirmed order', () => {
    const order = makeOrder(OrderStatus.CONFIRMED);

    order.activate();
    order.complete();

    expect(order.currentStatus).toBe(OrderStatus.COMPLETED);
  });

  it('rejects invalid transitions', () => {
    const order = makeOrder(OrderStatus.CONFIRMED);

    expect(() => order.reject()).toThrow(InvalidOrderStatusTransitionException);
    expect(() => order.expire()).toThrow(InvalidOrderStatusTransitionException);
  });

  it('reconstitutes existing orders with financial snapshot state', () => {
    const order = makeReconstitutedOrder();

    expect(order.currentFinancialSnapshot.total.toString()).toBe('0');
    expect(order.currentInsuranceSelected).toBe(false);
    expect(order.currentBookingSnapshot?.pickupDate).toBe('2026-03-30');
  });

  it('stores delivery request only for delivery fulfillment', () => {
    const order = Order.create({
      tenantId: 'tenant-1',
      locationId: 'location-1',
      currency: 'ARS',
      customerId: 'customer-1',
      period: DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z')),
      status: OrderStatus.PENDING_REVIEW,
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      deliveryRequest: makeDeliveryRequest(),
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

    expect(order.currentFulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
    expect(order.currentDeliveryRequest?.recipientName).toBe('Jane Doe');
  });
});
