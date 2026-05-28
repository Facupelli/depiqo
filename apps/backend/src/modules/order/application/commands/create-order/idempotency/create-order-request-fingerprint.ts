import { createHash } from 'crypto';

import { CreateOrderCommand, CreateOrderDeliveryRequestCommand, CreateOrderItemCommand } from '../create-order.command';

export function createOrderRequestHash(command: CreateOrderCommand): string {
  return createHash('sha256')
    .update(stableStringify(buildCreateOrderRequestFingerprint(command)))
    .digest('hex');
}

type CreateOrderRequestFingerprint = {
  tenantId: string;
  customerId: string | null;
  locationId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: number;
  returnTime: number;
  items: NormalizedCreateOrderItem[];
  currency: string;
  insuranceSelected: boolean;
  fulfillmentMethod: string;
  deliveryRequest: NormalizedCreateOrderDeliveryRequest | null;
  couponCode: string | null;
};

type NormalizedCreateOrderItem =
  | {
      type: 'PRODUCT';
      productTypeId: string;
      quantity: number | null;
      assetId: string | null;
    }
  | {
      type: 'BUNDLE';
      bundleId: string;
    };

type NormalizedCreateOrderDeliveryRequest = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
  instructions: string | null;
};

function buildCreateOrderRequestFingerprint(command: CreateOrderCommand): CreateOrderRequestFingerprint {
  return {
    tenantId: command.tenantId,
    customerId: command.customerId ?? null,
    locationId: command.locationId,
    pickupDate: command.pickupDate,
    returnDate: command.returnDate,
    pickupTime: command.pickupTime,
    returnTime: command.returnTime,
    items: command.items.map(normalizeItem),
    currency: command.currency,
    insuranceSelected: command.insuranceSelected,
    fulfillmentMethod: command.fulfillmentMethod,
    deliveryRequest: command.deliveryRequest ? normalizeDeliveryRequest(command.deliveryRequest) : null,
    couponCode: command.couponCode ?? null,
  };
}

function normalizeItem(item: CreateOrderItemCommand): NormalizedCreateOrderItem {
  if (item.type === 'PRODUCT') {
    return {
      type: 'PRODUCT',
      productTypeId: item.productTypeId,
      quantity: item.quantity ?? null,
      assetId: item.assetId ?? null,
    };
  }

  return {
    type: 'BUNDLE',
    bundleId: item.bundleId,
  };
}

function normalizeDeliveryRequest(request: CreateOrderDeliveryRequestCommand): NormalizedCreateOrderDeliveryRequest {
  return {
    recipientName: request.recipientName,
    phone: request.phone,
    addressLine1: request.addressLine1,
    addressLine2: request.addressLine2 ?? null,
    city: request.city,
    stateRegion: request.stateRegion,
    postalCode: request.postalCode,
    country: request.country,
    instructions: request.instructions ?? null,
  };
}

function stableStringify(value: unknown): string {
  if (value === undefined || value === null) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
