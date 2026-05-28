import { QueryBus } from '@nestjs/cqrs';
import { TenantConfig } from '@repo/schemas';
import { FulfillmentMethod, OrderItemType } from '@repo/types';

import { PrismaService } from 'src/core/database/prisma.service';
import { OrderFinancialSnapshot } from 'src/modules/order/domain/value-objects/order-financial-snapshot.value-object';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';

import { CreateOrderCompletionContext } from './create-order-next-step.types';

export async function loadCreateOrderCompletionContext(
  prisma: PrismaService,
  queryBus: QueryBus,
  tenantId: string,
  orderId: string,
): Promise<CreateOrderCompletionContext> {
  const [order, tenantConfig] = await Promise.all([
    prisma.client.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      select: {
        id: true,
        orderNumber: true,
        bookingSnapshot: true,
        fulfillmentMethod: true,
        financialSnapshot: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
        deliveryRequest: {
          select: {
            recipientName: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            stateRegion: true,
            postalCode: true,
            country: true,
            instructions: true,
          },
        },
        items: {
          select: {
            type: true,
            productType: {
              select: {
                name: true,
              },
            },
            bundle: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }),
    queryBus.execute<GetTenantConfigQuery, TenantConfig | null>(new GetTenantConfigQuery(tenantId)),
  ]);

  if (!order) {
    throw new Error(`Persisted order "${orderId}" not found after creation.`);
  }

  if (!tenantConfig) {
    throw new Error(`Tenant config not found for tenant "${tenantId}".`);
  }

  if (!hasBookingSnapshot(order.bookingSnapshot)) {
    throw new Error(`Persisted order "${orderId}" is missing a valid booking snapshot.`);
  }

  const financialSnapshot = OrderFinancialSnapshot.fromJSON(order.financialSnapshot);

  return {
    communication: {
      orderCommunicationMode: tenantConfig.communication.orderCommunicationMode,
      whatsAppNumber: tenantConfig.communication.whatsAppNumber,
    },
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
    },
    customer: {
      fullName: formatCustomerFullName(order.customer?.firstName, order.customer?.lastName),
    },
    booking: {
      pickupDate: order.bookingSnapshot.pickupDate,
      pickupTime: order.bookingSnapshot.pickupTime,
      returnDate: order.bookingSnapshot.returnDate,
      returnTime: order.bookingSnapshot.returnTime,
      timezone: order.bookingSnapshot.timezone,
    },
    fulfillment: {
      method: order.fulfillmentMethod as FulfillmentMethod,
      locationName: order.location?.name ?? null,
      deliveryRequest: order.deliveryRequest
        ? {
            recipientName: order.deliveryRequest.recipientName,
            addressLine1: order.deliveryRequest.addressLine1,
            addressLine2: order.deliveryRequest.addressLine2,
            city: order.deliveryRequest.city,
            stateRegion: order.deliveryRequest.stateRegion,
            postalCode: order.deliveryRequest.postalCode,
            country: order.deliveryRequest.country,
            instructions: order.deliveryRequest.instructions,
          }
        : null,
    },
    items: aggregateOrderItems(order.items),
    pricing: {
      currency: financialSnapshot.currency,
      totalAmount: financialSnapshot.total.toNumber(),
    },
  };
}

function aggregateOrderItems(
  items: Array<{
    type: 'PRODUCT' | 'BUNDLE';
    productType: { name: string } | null;
    bundle: { name: string } | null;
  }>,
): CreateOrderCompletionContext['items'] {
  const groupedItems = new Map<string, CreateOrderCompletionContext['items'][number]>();

  for (const item of items) {
    const name = resolveItemName(item);
    const key = `${item.type}:${name}`;
    const existing = groupedItems.get(key);

    if (existing) {
      existing.quantity += 1;
      continue;
    }

    groupedItems.set(key, {
      name,
      quantity: 1,
    });
  }

  return Array.from(groupedItems.values());
}

function resolveItemName(item: {
  type: 'PRODUCT' | 'BUNDLE';
  productType: { name: string } | null;
  bundle: { name: string } | null;
}): string {
  if (item.type === OrderItemType.PRODUCT) {
    if (!item.productType?.name) {
      throw new Error('Persisted product order item is missing product type name.');
    }

    return item.productType.name;
  }

  if (item.type === OrderItemType.BUNDLE) {
    if (!item.bundle?.name) {
      throw new Error('Persisted bundle order item is missing bundle name.');
    }

    return item.bundle.name;
  }

  throw new Error(`Unsupported order item type: ${item.type as string}`);
}

function formatCustomerFullName(firstName?: string | null, lastName?: string | null): string {
  const fullName = [firstName, lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();

  return fullName || 'Cliente';
}

function hasBookingSnapshot(raw: unknown): raw is {
  pickupDate: string;
  pickupTime: number;
  returnDate: string;
  returnTime: number;
  timezone: string;
} {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  const data = raw as Record<string, unknown>;

  return (
    typeof data.pickupDate === 'string' &&
    typeof data.pickupTime === 'number' &&
    typeof data.returnDate === 'string' &&
    typeof data.returnTime === 'number' &&
    typeof data.timezone === 'string'
  );
}
