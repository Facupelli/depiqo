import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssignmentSource,
  AssignmentType,
  BookingMode,
  FulfillmentMethod,
  OrderItemType,
  OrderAssignmentStage,
  OrderStatus,
  ScheduleSlotType,
} from '@repo/types';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { GetLocationScheduleSlotsQuery } from 'src/modules/tenant/public/queries/get-location-schedule-slots.query';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';
import { CouponNotFoundError, CouponValidationError, PricingPublicApi } from 'src/modules/pricing/pricing.public-api';
import {
  PricingBundleNotFoundError,
  PricingProductTypeNotFoundError,
} from 'src/modules/pricing/domain/errors/pricing.errors';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import { BundleSnapshot, BundleSnapshotComponent } from 'src/modules/order/domain/entities/bundle-snapshot.entity';
import { BookingSnapshot } from 'src/modules/order/domain/value-objects/booking-snapshot.value-object';
import { OrderDeliveryRequest } from 'src/modules/order/domain/value-objects/order-delivery-request.value-object';
import { TenantConfig } from '@repo/schemas';

import { CreateOrderResponseDto } from './create-order.response.dto';
import { CreateOrderCommand } from './create-order.command';
import { CreateOrderAssetResolver, buildDemandUnits } from './create-order-asset-resolver';
import { CreateOrderError, ResolvedItem } from './create-order.types';
import { CreateOrderOwnerContractResolver } from './create-order-owner-contract-resolver';
import { toPriceSnapshot } from './create-order-pricing-snapshot.mapper';
import {
  DeliveryNotSupportedForLocationError,
  InvalidPickupSlotError,
  InvalidBookingLocationError,
  InvalidReturnSlotError,
  BundleNotFoundError,
  OrderItemUnavailableError,
  OrderMustContainItemsError,
  ProductTypeNotFoundError,
} from '../../../domain/errors/order.errors';
import { TenantConfigNotFoundException } from '../../../domain/exceptions/order.exceptions';
import { OrderCreatedByCustomerEvent } from 'src/modules/order/public/events/order-created-by-customer.event';

@CommandHandler(CreateOrderCommand)
export class CreateOrderService implements ICommandHandler<CreateOrderCommand, Result<CreateOrderResponseDto, CreateOrderError>> {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly orderRepository: OrderRepository,
    private readonly pricingApi: PricingPublicApi,
    private readonly inventoryApi: InventoryPublicApi,
    private readonly assetResolver: CreateOrderAssetResolver,
    private readonly ownerContractResolver: CreateOrderOwnerContractResolver,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<CreateOrderResponseDto, CreateOrderError>> {
    if (command.items.length === 0) {
      return err(new OrderMustContainItemsError());
    }

    const locationValidation = await this.validateLocation(command);
    if (locationValidation.isErr()) {
      return err(locationValidation.error);
    }

    const slotValidation = await this.validateSlots(command);
    if (slotValidation.isErr()) {
      return err(slotValidation.error);
    }

    const bookingContext = await this.deriveBookingContext(command);
    const { period, bookingMode } = bookingContext;
    const now = new Date();
    const insuranceTerms = InsuranceCalculationService.resolveTerms(
      {
        insuranceEnabled: bookingContext.insuranceEnabled,
        insuranceRatePercent: bookingContext.insuranceRatePercent,
      },
      command.insuranceSelected,
    );

    let resolvedItems: ResolvedItem[];
    let resolvedCouponId: string | undefined;
    try {
      const pricedBasket = await this.pricingApi.priceBasket({
        tenantId: command.tenantId,
        locationId: command.locationId,
        currency: command.currency,
        customerId: command.customerId,
        period,
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
      resolvedCouponId = pricedBasket.resolvedCoupon?.couponId;
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
        return err(error as CreateOrderError);
      }

      throw error;
    }

    const result = await this.prisma.client.$transaction(async (tx) => {
      const order = Order.create({
        tenantId: command.tenantId,
        locationId: command.locationId,
        currency: command.currency,
        customerId: command.customerId,
        period,
        status: bookingMode === BookingMode.REQUEST_TO_BOOK ? OrderStatus.PENDING_REVIEW : OrderStatus.CONFIRMED,
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
        insuranceRatePercent: insuranceTerms.insuranceRatePercent,
      });

      let pendingAssignments: Array<Parameters<InventoryPublicApi['saveOrderAssignment']>[0]> = [];

      // Phase 1: construct the order aggregate in memory.
      if (bookingMode === BookingMode.REQUEST_TO_BOOK) {
        this.attachRequestToBookItemsToOrder(order, resolvedItems);
      } else {
        const demandUnits = buildDemandUnits(resolvedItems);
        const availability = await this.assetResolver.resolveDemand(demandUnits);
        if (availability.unavailableItems.length > 0 || availability.conflictGroups.length > 0) {
          return err(new OrderItemUnavailableError(availability.unavailableItems, availability.conflictGroups));
        }

        const contractByAssetId = await this.ownerContractResolver.resolve(command.tenantId, period.start, demandUnits);
        pendingAssignments = this.attachResolvedItemsToOrder(
          order,
          resolvedItems,
          demandUnits,
          contractByAssetId,
          OrderAssignmentStage.COMMITTED,
        );
      }

      // Phase 2: persist the order aggregate before dependent rows reference it.
      await this.orderRepository.save(order, tx);

      // Phase 3: persist dependent inventory assignments.
      for (const assignment of pendingAssignments) {
        const assignmentResult = await this.inventoryApi.saveOrderAssignment(assignment, tx);
        if (assignmentResult.isErr()) {
          return err(
            new OrderItemUnavailableError(
              resolvedItems.map((item) =>
                item.type === 'PRODUCT'
                  ? { type: 'PRODUCT', productTypeId: item.productTypeId }
                  : { type: 'BUNDLE', bundleId: item.bundleId },
              ),
            ),
          );
        }
      }

      // Phase 4: persist dependent pricing state.
      if (resolvedCouponId) {
        const redeemCouponResult = await this.pricingApi.redeemCouponWithinTransaction(
          {
            couponId: resolvedCouponId,
            orderId: order.id,
            customerId: command.customerId,
            now,
          },
          tx,
        );

        if (redeemCouponResult.isErr()) {
          return err(redeemCouponResult.error);
        }
      }

      return ok({
        orderId: order.id,
        status: order.currentStatus,
        fulfillmentMethod: order.currentFulfillmentMethod,
      });
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const persistedOrder = await this.prisma.client.order.findFirst({
      where: {
        id: result.value.orderId,
        tenantId: command.tenantId,
      },
      select: {
        orderNumber: true,
      },
    });

    if (!persistedOrder) {
      throw new Error(`Persisted order "${result.value.orderId}" not found after creation.`);
    }

    await this.eventEmitter.emitAsync(
      OrderCreatedByCustomerEvent.EVENT_NAME,
      new OrderCreatedByCustomerEvent({
        orderId: result.value.orderId,
        tenantId: command.tenantId,
        customerId: command.customerId!,
        locationId: command.locationId,
        orderNumber: persistedOrder.orderNumber,
        status: result.value.status,
        fulfillmentMethod: result.value.fulfillmentMethod,
        pickupDate: command.pickupDate,
        pickupTime: command.pickupTime,
        returnDate: command.returnDate,
        returnTime: command.returnTime,
      }),
    );

    return ok({ orderId: result.value.orderId, status: result.value.status });
  }

  private async validateLocation(
    command: CreateOrderCommand,
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

  private async validateSlots(
    command: CreateOrderCommand,
  ): Promise<Result<void, InvalidPickupSlotError | InvalidReturnSlotError>> {
    const [pickupSlots, returnSlots] = await Promise.all([
      this.queryBus.execute<GetLocationScheduleSlotsQuery, number[]>(
        new GetLocationScheduleSlotsQuery(
          command.tenantId,
          command.locationId,
          command.pickupDate,
          ScheduleSlotType.PICKUP,
        ),
      ),
      this.queryBus.execute<GetLocationScheduleSlotsQuery, number[]>(
        new GetLocationScheduleSlotsQuery(
          command.tenantId,
          command.locationId,
          command.returnDate,
          ScheduleSlotType.RETURN,
        ),
      ),
    ]);

    if (!pickupSlots.includes(command.pickupTime)) {
      return err(new InvalidPickupSlotError(command.pickupTime));
    }

    if (!returnSlots.includes(command.returnTime)) {
      return err(new InvalidReturnSlotError(command.returnTime));
    }

    return ok(undefined);
  }

  private async deriveBookingContext(command: CreateOrderCommand): Promise<{
    period: DateRange;
    bookingMode: BookingMode;
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
      bookingMode: tenantConfig.bookingMode,
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

  private attachResolvedItemsToOrder(
    order: Order,
    resolvedItems: ResolvedItem[],
    demandUnits: ReturnType<typeof buildDemandUnits>,
    contractByAssetId: Awaited<ReturnType<CreateOrderOwnerContractResolver['resolve']>>,
    assignmentStage: OrderAssignmentStage,
  ): Array<Parameters<InventoryPublicApi['saveOrderAssignment']>[0]> {
    let unitCursor = 0;
    const pendingAssignments: Array<Parameters<InventoryPublicApi['saveOrderAssignment']>[0]> = [];

    for (const item of resolvedItems) {
      if (item.type === 'PRODUCT') {
        const units = demandUnits.slice(unitCursor, unitCursor + item.quantity);
        unitCursor += item.quantity;

        for (const unit of units) {
          const orderItem = OrderItem.create({
            orderId: order.id,
            type: OrderItemType.PRODUCT,
            priceSnapshot: toPriceSnapshot(item.price, item.currency),
            productTypeId: item.productTypeId,
          });

          const contract = contractByAssetId.get(unit.resolvedAssetId!);
          if (contract) {
            orderItem.assignOwnerSplit({
              assetId: unit.resolvedAssetId!,
              ownerId: contract.ownerId,
              contractId: contract.contractId,
              ownerShare: new Decimal(contract.ownerShare),
              rentalShare: new Decimal(contract.rentalShare),
              basis: contract.basis,
              productTypeId: item.productTypeId,
            });
          }

          order.addItem(orderItem);
          pendingAssignments.push({
            assetId: unit.resolvedAssetId!,
            period: item.period,
            type: AssignmentType.ORDER,
            stage: assignmentStage,
            source: contract ? AssignmentSource.EXTERNAL : AssignmentSource.OWNED,
            orderId: order.id,
            orderItemId: orderItem.id,
          });
        }

        continue;
      }

      const totalComponentUnits = item.bundle.components.reduce((sum, component) => sum + component.quantity, 0);
      const units = demandUnits.slice(unitCursor, unitCursor + totalComponentUnits);
      unitCursor += totalComponentUnits;

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

      const snapshot = BundleSnapshot.create({
        orderItemId: orderItem.id,
        bundleId: item.bundle.id,
        bundleName: item.bundle.name,
        bundlePrice: item.price.finalPrice.toDecimal(),
        components: snapshotComponents,
      });

      const orderItemWithSnapshot = OrderItem.reconstitute({
        id: orderItem.id,
        orderId: orderItem.orderId,
        type: orderItem.type,
        priceSnapshot: orderItem.priceSnapshot,
        manualPricingOverride: null,
        productTypeId: orderItem.productTypeId,
        bundleId: orderItem.bundleId,
        bundleSnapshot: snapshot,
        ownerSplits: [],
      });

      for (const unit of units) {
        const contract = contractByAssetId.get(unit.resolvedAssetId!);
        if (contract) {
          orderItemWithSnapshot.assignOwnerSplit({
            assetId: unit.resolvedAssetId!,
            ownerId: contract.ownerId,
            contractId: contract.contractId,
            ownerShare: new Decimal(contract.ownerShare),
            rentalShare: new Decimal(contract.rentalShare),
            basis: contract.basis,
            productTypeId: unit.productTypeId,
          });
        }
      }

      order.addItem(orderItemWithSnapshot);

      for (const unit of units) {
        pendingAssignments.push({
          assetId: unit.resolvedAssetId!,
          period: item.period,
          type: AssignmentType.ORDER,
          stage: assignmentStage,
          source: contractByAssetId.has(unit.resolvedAssetId!) ? AssignmentSource.EXTERNAL : AssignmentSource.OWNED,
          orderId: order.id,
          orderItemId: orderItemWithSnapshot.id,
        });
      }
    }

    return pendingAssignments;
  }

  private attachRequestToBookItemsToOrder(order: Order, resolvedItems: ResolvedItem[]): void {
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
}
