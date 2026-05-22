import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { GetOrderByIdQuery } from './get-order-by-id.query';
import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { FulfillmentMethod, OrderItemType, OrderStatus } from '@repo/types';
import { OrderFinancialSnapshot } from 'src/modules/order/domain/value-objects/order-financial-snapshot.value-object';
import { ManualPricingOverride } from 'src/modules/order/domain/value-objects/manual-pricing-override.value-object';
import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import Decimal from 'decimal.js';
import { OrderNotFoundException } from '../../../domain/exceptions/order.exceptions';
import { GetOrderByIdResponseDto } from './get-order-by-id.response.dto';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';
import {
  DocumentSigningPublicDocumentTypes,
  GetOrderSigningSummaryQuery,
  OrderSigningSummaryReadModel,
} from 'src/modules/document-signing/public/queries/get-order-signing-summary.query';

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdQueryHandler implements IQueryHandler<GetOrderByIdQuery, GetOrderByIdResponseDto> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetOrderByIdQuery): Promise<GetOrderByIdResponseDto> {
    const order = await this.prisma.client.order.findFirst({
      where: { id: query.orderId, tenantId: query.tenantId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isCompany: true,
            companyName: true,
          },
        },
        location: {
          select: { name: true },
        },
        deliveryRequest: {
          select: {
            recipientName: true,
            phone: true,
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
          include: {
            productType: {
              select: { imageUrl: true, name: true },
            },
            bundle: {
              select: {
                imageUrl: true,
                name: true,
                components: {
                  select: {
                    quantity: true,
                    productType: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
            assetAssignments: {
              select: {
                asset: {
                  select: {
                    id: true,
                    serialNumber: true,
                    ownerId: true,
                    productTypeId: true,
                    owner: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
            accessories: {
              select: {
                id: true,
                accessoryRentalItemId: true,
                quantity: true,
                notes: true,
                accessoryRentalItem: {
                  select: { name: true },
                },
                assetAssignments: {
                  select: {
                    asset: {
                      select: {
                        id: true,
                        serialNumber: true,
                        ownerId: true,
                        productTypeId: true,
                        owner: {
                          select: { name: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            ownerSplits: {
              select: {
                assetId: true,
                ownerAmount: true,
                rentalAmount: true,
                owner: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(query.orderId);
    }

    const [locationContext, signing] = await Promise.all([
      this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
        new GetLocationContextQuery(query.tenantId, order.locationId),
      ),
      this.queryBus.execute<GetOrderSigningSummaryQuery, OrderSigningSummaryReadModel>(
        new GetOrderSigningSummaryQuery(
          query.tenantId,
          query.orderId,
          DocumentSigningPublicDocumentTypes.RENTAL_AGREEMENT,
        ),
      ),
    ]);

    if (!locationContext) {
      throw new Error(`Location context not found for location "${order.locationId}"`);
    }

    const period = DateRange.create(order.periodStart, order.periodEnd);
    const financialSnapshot = OrderFinancialSnapshot.fromJSON(order.financialSnapshot);
    const bookingSnapshot = hasBookingSnapshot(order.bookingSnapshot)
      ? BookingSnapshot.fromJSON(order.bookingSnapshot)
      : buildLegacyBookingSnapshot(order.periodStart, order.periodEnd, locationContext.effectiveTimezone);

    // ── Items ─────────────────────────────────────────────────────────────────

    const items: GetOrderByIdResponseDto['items'] = order.items.map((item) => {
      const assets = item.assetAssignments.map((aa) => ({
        id: aa.asset.id,
        serialNumber: aa.asset.serialNumber,
        ownerId: aa.asset.ownerId,
        productTypeId: aa.asset.productTypeId,
        ownerName: aa.asset.owner?.name ?? null,
      }));
      const accessories = item.accessories.map((accessory) => ({
        id: accessory.id,
        accessoryRentalItemId: accessory.accessoryRentalItemId,
        name: accessory.accessoryRentalItem.name,
        quantity: accessory.quantity,
        notes: accessory.notes,
        assignedAssets: accessory.assetAssignments.map((aa) => ({
          id: aa.asset.id,
          serialNumber: aa.asset.serialNumber,
          ownerId: aa.asset.ownerId,
          productTypeId: aa.asset.productTypeId,
          ownerName: aa.asset.owner?.name ?? null,
        })),
      }));

      if (item.type === OrderItemType.PRODUCT && item.productType) {
        return {
          id: item.id,
          type: OrderItemType.PRODUCT,
          productTypeId: item.productTypeId!,
          name: item.productType.name,
          imageUrl: item.productType.imageUrl,
          assets,
          accessories,
        };
      }

      if (item.type === OrderItemType.BUNDLE && item.bundle) {
        return {
          id: item.id,
          type: OrderItemType.BUNDLE,
          bundleId: item.bundleId!,
          name: item.bundle.name,
          imageUrl: item.bundle.imageUrl,
          components: item.bundle.components.map((c) => ({
            productTypeId: c.productType.id,
            productTypeName: c.productType.name,
            quantity: c.quantity,
          })),
          assets,
        };
      }

      throw new Error(`Unexpected item type: ${item.type as string}`);
    });

    // ── Financial breakdown ───────────────────────────────────────────────────

    let totalOwnerObligations = new Decimal(0);

    const financialItems = order.items.map((item) => {
      const snapshot = PriceSnapshot.fromJSON(item.priceSnapshot);
      const manualPricingOverride = item.manualPricingOverride
        ? ManualPricingOverride.fromJSON(item.manualPricingOverride)
        : null;
      const effectiveFinalPrice = manualPricingOverride?.finalPrice ?? snapshot.finalPrice;
      const manualAdjustmentAmount = snapshot.finalPrice.minus(effectiveFinalPrice);
      const label = item.type === OrderItemType.PRODUCT ? item.productType!.name : item.bundle!.name;

      let ownerSplitLine: GetOrderByIdResponseDto['financial']['items'][number]['ownerSplit'] = null;

      if (item.ownerSplits.length > 0) {
        // Build a map from assetId → productTypeId using the asset assignments
        const productTypeByAssetId = new Map(item.assetAssignments.map((aa) => [aa.asset.id, aa.asset.productTypeId]));

        // Build a map from productTypeId → component name using the bundle snapshot.
        // For product items this map is empty — componentName will always be null.
        const componentNameByProductTypeId = new Map(
          item.type === OrderItemType.BUNDLE
            ? item.bundle!.components.map((c) => [c.productType.id, c.productType.name])
            : [],
        );

        const totalOwnerAmount = item.ownerSplits.reduce(
          (sum, s) => sum.plus(s.ownerAmount.toString()),
          new Decimal(0),
        );
        const totalRentalAmount = item.ownerSplits.reduce(
          (sum, s) => sum.plus(s.rentalAmount.toString()),
          new Decimal(0),
        );
        const ownerNames = [...new Set(item.ownerSplits.map((s) => s.owner.name))].join(', ');

        // Resolve component name: follow assetId → productTypeId → component name.
        // For product items or when only one split exists with no bundle context,
        // componentName is null — the UI omits the component label.
        const componentNames = [
          ...new Set(
            item.ownerSplits
              .map((s) => {
                const productTypeId = productTypeByAssetId.get(s.assetId);
                return productTypeId ? (componentNameByProductTypeId.get(productTypeId) ?? null) : null;
              })
              .filter((n): n is string => n !== null),
          ),
        ].join(', ');

        totalOwnerObligations = totalOwnerObligations.plus(totalOwnerAmount);

        ownerSplitLine = {
          ownerName: ownerNames,
          componentName: componentNames || null, // null for product items
          ownerAmount: totalOwnerAmount.toString(),
          rentalAmount: totalRentalAmount.toString(),
        };
      }

      return {
        orderItemId: item.id,
        label,
        currency: snapshot.currency,
        basePrice: snapshot.basePrice.toString(),
        finalPrice: effectiveFinalPrice.toString(),
        discounts: toDiscountLineDtos(snapshot.discounts),
        pricing: {
          isOverridden: manualPricingOverride !== null,
          effective: {
            finalPrice: effectiveFinalPrice.toString(),
            pricePerBillingUnit: toPricePerBillingUnit(snapshot, effectiveFinalPrice).toString(),
            discounts: toDiscountLineDtos(snapshot.discounts),
          },
          calculated: {
            basePrice: snapshot.basePrice.toString(),
            finalPrice: snapshot.finalPrice.toString(),
            pricePerBillingUnit: snapshot.pricePerBillingUnit.toString(),
            discounts: toDiscountLineDtos(snapshot.discounts),
          },
          manualOverride: manualPricingOverride
            ? {
                finalPrice: manualPricingOverride.finalPrice.toString(),
                setByUserId: manualPricingOverride.setByUserId,
                setAt: manualPricingOverride.setAt,
                previousFinalPrice: manualPricingOverride.previousFinalPrice?.toString() ?? null,
              }
            : null,
          manualAdjustment: manualPricingOverride
            ? {
                adjustmentAmount: manualAdjustmentAmount.toString(),
              }
            : null,
        },
        ownerSplit: ownerSplitLine,
      };
    });

    const yourRevenue = financialSnapshot.itemsSubtotal.minus(totalOwnerObligations);

    return {
      id: order.id,
      status: order.status as OrderStatus,
      fulfillmentMethod: order.fulfillmentMethod as FulfillmentMethod,
      number: order.orderNumber,
      createdAt: order.createdAt,
      bookingSnapshot: {
        pickupDate: bookingSnapshot.pickupDate,
        pickupTime: bookingSnapshot.pickupTime,
        returnDate: bookingSnapshot.returnDate,
        returnTime: bookingSnapshot.returnTime,
        timezone: bookingSnapshot.timezone,
      },
      pickupAt: order.periodStart,
      returnAt: order.periodEnd,
      notes: order.notes,
      customer: order.customer ?? null,
      location: {
        name: order.location.name,
        effectiveTimezone: locationContext.effectiveTimezone,
      },
      deliveryRequest: order.deliveryRequest
        ? {
            recipientName: order.deliveryRequest.recipientName,
            phone: order.deliveryRequest.phone,
            addressLine1: order.deliveryRequest.addressLine1,
            addressLine2: order.deliveryRequest.addressLine2,
            city: order.deliveryRequest.city,
            stateRegion: order.deliveryRequest.stateRegion,
            postalCode: order.deliveryRequest.postalCode,
            country: order.deliveryRequest.country,
            instructions: order.deliveryRequest.instructions,
          }
        : null,
      period,
      items,
      financial: {
        items: financialItems,
        itemsSubtotal: financialSnapshot.itemsSubtotal.toString(),
        subtotalBeforeDiscounts: financialSnapshot.subtotalBeforeDiscounts.toString(),
        itemsDiscountTotal: financialSnapshot.itemsDiscountTotal.toString(),
        insuranceApplied: financialSnapshot.insuranceApplied,
        insuranceAmount: financialSnapshot.insuranceAmount.toString(),
        total: financialSnapshot.total.toString(),
        yourRevenue: yourRevenue.toString(),
        ownerObligations: totalOwnerObligations.toString(),
      },
      signing,
    };
  }
}

function toDiscountLineDtos(discounts: PriceSnapshot['discounts']) {
  return discounts.map((d) => ({
    sourceKind: d.sourceKind,
    sourceId: d.sourceId,
    label: d.label,
    promotionId: d.sourceKind === 'PROMOTION' ? d.sourceId : null,
    promotionLabel: d.sourceKind === 'PROMOTION' ? d.label : null,
    type: d.type,
    value: d.value,
    discountAmount: d.discountAmount.toString(),
  }));
}

function toPricePerBillingUnit(snapshot: PriceSnapshot, finalPrice: Decimal): Decimal {
  if (snapshot.totalUnits <= 0) {
    return snapshot.pricePerBillingUnit;
  }

  return finalPrice.div(snapshot.totalUnits).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
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

function buildLegacyBookingSnapshot(periodStart: Date, periodEnd: Date, timezone: string): BookingSnapshot {
  return BookingSnapshot.reconstitute({
    pickupDate: toLocalDateKey(periodStart, timezone),
    pickupTime: toMinutesFromMidnight(periodStart, timezone),
    returnDate: toLocalDateKey(periodEnd, timezone),
    returnTime: toMinutesFromMidnight(periodEnd, timezone),
    timezone,
  });
}

function toLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toMinutesFromMidnight(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');

  return get('hour') * 60 + get('minute');
}
