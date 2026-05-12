import { JsonValue } from '@prisma/client/runtime/client';
import { ContractBasis, FulfillmentMethod, OrderStatus, OrderItemType } from '@repo/types';
import Decimal from 'decimal.js';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { BundleSnapshot, BundleSnapshotComponent } from 'src/modules/order/domain/entities/bundle-snapshot.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { OrderItemOwnerSplit, SplitStatus } from 'src/modules/order/domain/entities/order-item-owner-split.entity';
import { OrderFinancialSnapshot } from 'src/modules/order/domain/value-objects/order-financial-snapshot.value-object';
import { OrderDeliveryRequest } from 'src/modules/order/domain/value-objects/order-delivery-request.value-object';
import { ManualPricingOverride } from 'src/modules/order/domain/value-objects/manual-pricing-override.value-object';
import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { Prisma } from 'src/generated/prisma/client';

// ── Prisma row shapes (from include queries) ──────────────────────────────────

type BundleSnapshotComponentRow = {
  id: string;
  bundleSnapshotId: string;
  productTypeId: string;
  productTypeName: string;
  quantity: number;
  pricePerUnit: Decimal;
};

type BundleSnapshotRow = {
  id: string;
  orderItemId: string;
  bundleId: string;
  bundleName: string;
  bundlePrice: Decimal;
  components: BundleSnapshotComponentRow[];
};

type OrderItemOwnerSplitRow = {
  id: string;
  orderItemId: string;
  assetId: string;
  ownerId: string;
  contractId: string;
  status: string;
  ownerShare: Decimal;
  rentalShare: Decimal;
  basis: string;
  grossAmount: Decimal;
  netAmount: Decimal;
  ownerAmount: Decimal;
  rentalAmount: Decimal;
};

type OrderItemRow = {
  id: string;
  orderId: string;
  type: string;
  priceSnapshot: JsonValue;
  manualPricingOverride: JsonValue | null;
  productTypeId: string | null;
  bundleId: string | null;
  bundleSnapshot: BundleSnapshotRow | null;
  ownerSplits: OrderItemOwnerSplitRow[];
};

type OrderRow = {
  id: string;
  tenantId: string;
  locationId: string;
  customerId: string | null;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  fulfillmentMethod: string;
  bookingSnapshot: JsonValue;
  insuranceSelected: boolean;
  financialSnapshot: JsonValue;
  notes: string | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  deliveryRequest: {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateRegion: string;
    postalCode: string;
    country: string;
    instructions: string | null;
  } | null;
  items: OrderItemRow[];
};

// ── Mapper ────────────────────────────────────────────────────────────────────

export class OrderMapper {
  static toDomain(row: OrderRow): Order {
    const items = row.items.map((itemRow) => {
      const bundleSnapshot = itemRow.bundleSnapshot
        ? BundleSnapshot.reconstitute({
            id: itemRow.bundleSnapshot.id,
            orderItemId: itemRow.bundleSnapshot.orderItemId,
            bundleId: itemRow.bundleSnapshot.bundleId,
            bundleName: itemRow.bundleSnapshot.bundleName,
            bundlePrice: itemRow.bundleSnapshot.bundlePrice,
            components: itemRow.bundleSnapshot.components.map((c) =>
              BundleSnapshotComponent.reconstitute({
                id: c.id,
                productTypeId: c.productTypeId,
                productTypeName: c.productTypeName,
                quantity: c.quantity,
                pricePerUnit: c.pricePerUnit,
              }),
            ),
          })
        : null;

      const ownerSplits = itemRow.ownerSplits.map((s) =>
        OrderItemOwnerSplit.reconstitute({
          id: s.id,
          orderItemId: s.orderItemId,
          assetId: s.assetId,
          ownerId: s.ownerId,
          contractId: s.contractId,
          status: s.status as SplitStatus,
          ownerShare: s.ownerShare,
          rentalShare: s.rentalShare,
          basis: s.basis as ContractBasis,
          grossAmount: s.grossAmount,
          netAmount: s.netAmount,
          ownerAmount: s.ownerAmount,
          rentalAmount: s.rentalAmount,
        }),
      );

      return OrderItem.reconstitute({
        id: itemRow.id,
        orderId: itemRow.orderId,
        type: itemRow.type as OrderItemType,
        priceSnapshot: PriceSnapshot.fromJSON(itemRow.priceSnapshot),
        manualPricingOverride: itemRow.manualPricingOverride
          ? ManualPricingOverride.fromJSON(itemRow.manualPricingOverride)
          : null,
        productTypeId: itemRow.productTypeId,
        bundleId: itemRow.bundleId,
        bundleSnapshot,
        ownerSplits,
      });
    });

    return Order.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      locationId: row.locationId,
      customerId: row.customerId,
      period: DateRange.create(row.periodStart, row.periodEnd),
      status: row.status as OrderStatus,
      fulfillmentMethod: row.fulfillmentMethod as FulfillmentMethod,
      deliveryRequest: row.deliveryRequest
        ? OrderDeliveryRequest.reconstitute({
            recipientName: row.deliveryRequest.recipientName,
            phone: row.deliveryRequest.phone,
            addressLine1: row.deliveryRequest.addressLine1,
            addressLine2: row.deliveryRequest.addressLine2,
            city: row.deliveryRequest.city,
            stateRegion: row.deliveryRequest.stateRegion,
            postalCode: row.deliveryRequest.postalCode,
            country: row.deliveryRequest.country,
            instructions: row.deliveryRequest.instructions,
          })
        : null,
      bookingSnapshot: hasBookingSnapshot(row.bookingSnapshot) ? BookingSnapshot.fromJSON(row.bookingSnapshot) : null,
      insuranceSelected: row.insuranceSelected,
      financialSnapshot: OrderFinancialSnapshot.fromJSON(row.financialSnapshot),
      notes: row.notes,
      items,
      reviewedAt: row.reviewedAt,
      reviewedByUserId: row.reviewedByUserId,
      rejectionReason: row.rejectionReason,
    });
  }

  static toPersistence(order: Order) {
    const orderRow = {
      id: order.id,
      tenantId: order.tenantId,
      locationId: order.locationId,
      customerId: order.customerId,
      periodStart: order.currentPeriod.start,
      periodEnd: order.currentPeriod.end,
      status: order.currentStatus,
      fulfillmentMethod: order.currentFulfillmentMethod,
      bookingSnapshot: order.currentBookingSnapshot?.toJSON() ?? {},
      insuranceSelected: order.currentInsuranceSelected,
      financialSnapshot: order.currentFinancialSnapshot.toJSON(),
      notes: order.currentNotes,
      reviewedAt: order.currentReviewedAt,
      reviewedByUserId: order.currentReviewedByUserId,
      rejectionReason: order.currentRejectionReason,
    };

    const deliveryRequestRow = order.currentDeliveryRequest
      ? {
          orderId: order.id,
          ...order.currentDeliveryRequest.toJSON(),
        }
      : null;

    const itemRows = [];
    const snapshotRows = [];
    const snapshotComponentRows = [];
    const splitRows = [];

    for (const item of order.getItems()) {
      itemRows.push({
        id: item.id,
        orderId: item.orderId,
        type: item.type,
        priceSnapshot: item.priceSnapshot.toJSON(),
        manualPricingOverride: item.manualPricingOverride?.toJSON() ?? Prisma.JsonNull,
        productTypeId: item.productTypeId,
        bundleId: item.bundleId,
      });

      if (item.bundleSnapshot) {
        snapshotRows.push({
          id: item.bundleSnapshot.id,
          orderItemId: item.bundleSnapshot.orderItemId,
          bundleId: item.bundleSnapshot.bundleId,
          bundleName: item.bundleSnapshot.bundleName,
          bundlePrice: item.bundleSnapshot.bundlePrice,
        });

        for (const component of item.bundleSnapshot.components) {
          snapshotComponentRows.push({
            id: component.id,
            bundleSnapshotId: item.bundleSnapshot.id,
            productTypeId: component.productTypeId,
            productTypeName: component.productTypeName,
            quantity: component.quantity,
            pricePerUnit: component.pricePerUnit,
          });
        }
      }

      for (const split of item.ownerSplits) {
        splitRows.push({
          id: split.id,
          orderItemId: split.orderItemId,
          assetId: split.assetId,
          ownerId: split.ownerId,
          contractId: split.contractId,
          status: split.status,
          ownerShare: split.ownerShare,
          rentalShare: split.rentalShare,
          basis: split.basis,
          grossAmount: split.grossAmount,
          netAmount: split.netAmount,
          ownerAmount: split.ownerAmount,
          rentalAmount: split.rentalAmount,
        });
      }
    }

    return { orderRow, deliveryRequestRow, itemRows, snapshotRows, snapshotComponentRows, splitRows };
  }
}

function hasBookingSnapshot(raw: unknown): raw is Record<string, unknown> {
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
