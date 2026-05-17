import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { TenantConfig } from '@repo/schemas';
import { FulfillmentMethod, OrderItemType, OrderStatus } from '@repo/types';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { BundleSnapshot, BundleSnapshotComponent } from 'src/modules/order/domain/entities/bundle-snapshot.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import {
  BundleNotFoundError,
  DeliveryNotSupportedForLocationError,
  InvalidBookingLocationError,
  InvalidPickupSlotError,
  InvalidReturnSlotError,
  OrderDraftEditNotAllowedError,
  OrderMustContainItemsError,
  OrderNotFoundError,
  OrderPricingTargetTotalInvalidError,
  ProductTypeNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';
import { DraftOrderPricingService } from 'src/modules/order/domain/services/draft-order-pricing.service';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { ManualPricingOverride } from 'src/modules/order/domain/value-objects/manual-pricing-override.value-object';
import { OrderDeliveryRequest } from 'src/modules/order/domain/value-objects/order-delivery-request.value-object';
import { OrderFinancialSnapshot } from 'src/modules/order/domain/value-objects/order-financial-snapshot.value-object';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { CouponNotFoundError, CouponValidationError, PricingPublicApi } from 'src/modules/pricing/pricing.public-api';
import {
  PricingBundleNotFoundError,
  PricingProductTypeNotFoundError,
} from 'src/modules/pricing/domain/errors/pricing.errors';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';

import { UpdateDraftOrderCommand } from './update-draft-order.command';
import { toPriceSnapshot } from '../create-order/pricing/create-order-pricing-snapshot.mapper';
import { ResolvedItem } from '../create-order/create-order.types';
import { TenantConfigNotFoundException } from '../../../domain/exceptions/order.exceptions';

type UpdateDraftOrderError =
  | BundleInactiveForBookingError
  | BundleNotBookableAtLocationError
  | BundleNotFoundError
  | CouponNotFoundError
  | CouponValidationError
  | DeliveryNotSupportedForLocationError
  | InvalidBookingLocationError
  | InvalidPickupSlotError
  | InvalidReturnSlotError
  | OrderDraftEditNotAllowedError
  | OrderMustContainItemsError
  | OrderNotFoundError
  | OrderPricingTargetTotalInvalidError
  | ProductTypeInactiveForBookingError
  | ProductTypeNotBookableAtLocationError
  | ProductTypeNotFoundError;

@CommandHandler(UpdateDraftOrderCommand)
export class UpdateDraftOrderService implements ICommandHandler<
  UpdateDraftOrderCommand,
  Result<void, UpdateDraftOrderError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly orderRepository: OrderRepository,
    private readonly pricingApi: PricingPublicApi,
    private readonly draftOrderPricingService: DraftOrderPricingService,
  ) {}

  async execute(command: UpdateDraftOrderCommand): Promise<Result<void, UpdateDraftOrderError>> {
    const existingOrder = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!existingOrder) {
      return err(new OrderNotFoundError(command.orderId));
    }

    if (existingOrder.currentStatus !== OrderStatus.DRAFT) {
      return err(new OrderDraftEditNotAllowedError(existingOrder.currentStatus));
    }

    if (command.items.length === 0) {
      return err(new OrderMustContainItemsError());
    }

    const locationValidation = await this.validateLocation(command);
    if (locationValidation.isErr()) {
      return err(locationValidation.error);
    }

    const bookingContext = await this.deriveBookingContext(command);
    const now = new Date();
    const insuranceTerms = InsuranceCalculationService.resolveTerms(
      {
        insuranceEnabled: bookingContext.insuranceEnabled,
        insuranceRatePercent: bookingContext.insuranceRatePercent,
      },
      command.insuranceSelected,
    );

    let resolvedItems: ResolvedItem[];
    try {
      const pricedBasket = await this.pricingApi.priceBasket({
        tenantId: command.tenantId,
        locationId: command.locationId,
        currency: command.currency,
        customerId: command.customerId,
        period: bookingContext.period,
        bookingCreatedAt: now,
        couponCode: command.couponCode,
        items: command.items.map((item) =>
          item.type === 'PRODUCT'
            ? {
                type: 'PRODUCT' as const,
                productTypeId: item.productTypeId,
                quantity: item.quantity,
                assetId: item.assetId,
              }
            : {
                type: 'BUNDLE' as const,
                bundleId: item.bundleId,
              },
        ),
      });

      resolvedItems = this.toResolvedItems(pricedBasket.items);
    } catch (error) {
      if (error instanceof PricingProductTypeNotFoundError) {
        return err(new ProductTypeNotFoundError(error.productTypeId));
      }

      if (error instanceof PricingBundleNotFoundError) {
        return err(new BundleNotFoundError(error.bundleId));
      }

      if (
        error instanceof CouponNotFoundError ||
        error instanceof CouponValidationError ||
        error instanceof ProductTypeInactiveForBookingError ||
        error instanceof BundleInactiveForBookingError ||
        error instanceof ProductTypeNotBookableAtLocationError ||
        error instanceof BundleNotBookableAtLocationError
      ) {
        return err(error as UpdateDraftOrderError);
      }

      throw error;
    }

    try {
      await this.prisma.client.$transaction(async (tx) => {
        const replacementOrder = Order.reconstitute({
          id: existingOrder.id,
          tenantId: existingOrder.tenantId,
          locationId: command.locationId,
          customerId: command.customerId ?? null,
          period: bookingContext.period,
          status: OrderStatus.DRAFT,
          fulfillmentMethod: command.fulfillmentMethod,
          deliveryRequest:
            command.fulfillmentMethod === FulfillmentMethod.DELIVERY && command.deliveryRequest
              ? OrderDeliveryRequest.create(command.deliveryRequest)
              : null,
          bookingSnapshot: BookingSnapshot.create({
            pickupDate: command.pickupDate,
            pickupTime: command.pickupTime,
            returnDate: command.returnDate,
            returnTime: command.returnTime,
            timezone: bookingContext.timezone,
          }),
          insuranceSelected: insuranceTerms.insuranceSelected,
          financialSnapshot: OrderFinancialSnapshot.zero(
            command.currency,
            insuranceTerms.insuranceSelected,
            insuranceTerms.insuranceRatePercent,
          ),
          notes: existingOrder.currentNotes,
          items: [],
        });

        this.attachResolvedItemsToOrder(replacementOrder, resolvedItems);
        this.applyPricingAdjustment(replacementOrder, command, now);

        await this.orderRepository.save(replacementOrder, tx, { replaceChildren: true });
      });
    } catch (error) {
      if (error instanceof OrderPricingTargetTotalInvalidError) {
        return err(error);
      }

      throw error;
    }

    return ok(undefined);
  }

  private async validateLocation(
    command: UpdateDraftOrderCommand,
  ): Promise<Result<void, InvalidBookingLocationError | DeliveryNotSupportedForLocationError>> {
    const location = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(command.tenantId, command.locationId),
    );

    if (!location) {
      return err(new InvalidBookingLocationError(command.locationId));
    }

    if (command.fulfillmentMethod === FulfillmentMethod.DELIVERY && !location.supportsDelivery) {
      return err(new DeliveryNotSupportedForLocationError(command.locationId));
    }

    return ok(undefined);
  }

  private async deriveBookingContext(command: UpdateDraftOrderCommand): Promise<{
    period: DateRange;
    insuranceEnabled: boolean;
    insuranceRatePercent: number;
    timezone: string;
  }> {
    const [locationContext, tenantConfig] = await Promise.all([
      this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
        new GetLocationContextQuery(command.tenantId, command.locationId),
      ),
      this.queryBus.execute<GetTenantConfigQuery, TenantConfig | null>(new GetTenantConfigQuery(command.tenantId)),
    ]);

    if (!locationContext) {
      throw new Error(`Location context not found for location "${command.locationId}"`);
    }

    if (!tenantConfig) {
      throw new TenantConfigNotFoundException(command.tenantId);
    }

    return {
      period: DateRange.fromLocalDateKeySlots(
        command.pickupDate,
        command.pickupTime,
        command.returnDate,
        command.returnTime,
        locationContext.effectiveTimezone,
      ),
      insuranceEnabled: tenantConfig.pricing.insuranceEnabled,
      insuranceRatePercent: tenantConfig.pricing.insuranceRatePercent,
      timezone: locationContext.effectiveTimezone,
    };
  }

  private toResolvedItems(pricedItems: Awaited<ReturnType<PricingPublicApi['priceBasket']>>['items']): ResolvedItem[] {
    return pricedItems.map((item) => {
      if (item.type === 'PRODUCT') {
        return {
          type: 'PRODUCT',
          productTypeId: item.productTypeId,
          quantity: item.quantity,
          assetId: item.assetId,
          locationId: item.locationId,
          period: item.period,
          currency: item.currency,
          price: item.price,
        };
      }

      return {
        type: 'BUNDLE',
        bundleId: item.bundleId,
        bundle: {
          id: item.bundleId,
          name: item.bundleName,
          components: item.components.map((component) => ({
            productTypeId: component.productTypeId,
            productTypeName: component.productTypeName,
            quantity: component.quantity,
          })),
        },
        locationId: item.locationId,
        period: item.period,
        currency: item.currency,
        price: item.price,
        componentStandalonePrices: new Map(
          item.components.map((component) => [component.productTypeId, component.standalonePricePerUnit]),
        ),
      };
    });
  }

  private attachResolvedItemsToOrder(order: Order, resolvedItems: ResolvedItem[]): void {
    for (const item of resolvedItems) {
      if (item.type === 'PRODUCT') {
        for (let index = 0; index < item.quantity; index += 1) {
          order.addItem(
            OrderItem.create({
              orderId: order.id,
              type: OrderItemType.PRODUCT,
              priceSnapshot: toPriceSnapshot(item.price, item.currency),
              productTypeId: item.productTypeId,
            }),
          );
        }

        continue;
      }

      const snapshotComponents = item.bundle.components.map((component) =>
        BundleSnapshotComponent.create({
          productTypeId: component.productTypeId,
          productTypeName: component.productTypeName,
          quantity: component.quantity,
          pricePerUnit: item.componentStandalonePrices.get(component.productTypeId) ?? new Decimal(0),
        }),
      );

      const orderItem = OrderItem.create({
        orderId: order.id,
        type: OrderItemType.BUNDLE,
        priceSnapshot: toPriceSnapshot(item.price, item.currency),
        bundleId: item.bundleId,
      });

      order.addItem(
        OrderItem.reconstitute({
          id: orderItem.id,
          orderId: orderItem.orderId,
          type: orderItem.type,
          priceSnapshot: orderItem.priceSnapshot,
          manualPricingOverride: null,
          productTypeId: orderItem.productTypeId,
          bundleId: orderItem.bundleId,
          bundleSnapshot: BundleSnapshot.create({
            orderItemId: orderItem.id,
            bundleId: item.bundle.id,
            bundleName: item.bundle.name,
            bundlePrice: item.price.finalPrice.toDecimal(),
            components: snapshotComponents,
          }),
          ownerSplits: [],
        }),
      );
    }
  }

  private applyPricingAdjustment(order: Order, command: UpdateDraftOrderCommand, setAt: Date): void {
    if (command.pricingAdjustment?.mode !== 'TARGET_TOTAL') {
      return;
    }

    const finalPriceByItemId = this.draftOrderPricingService.buildFinalPriceMapFromTargetTotal(
      order,
      new Decimal(command.pricingAdjustment.targetTotal),
    );

    for (const [orderItemId, finalPrice] of finalPriceByItemId) {
      const item = order.getItems().find((candidate) => candidate.id === orderItemId);
      if (!item) {
        throw new Error(`Order item '${orderItemId}' was not found during draft pricing replacement.`);
      }

      order.replaceItemManualPricingOverride(
        orderItemId,
        finalPrice.eq(item.calculatedPriceSnapshot.finalPrice)
          ? null
          : ManualPricingOverride.create({
              finalPrice,
              setByUserId: command.setByUserId,
              setAt,
              previousFinalPrice: item.effectiveFinalPrice,
            }),
      );
    }
  }
}
