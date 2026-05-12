import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { TenantConfig } from '@repo/schemas';
import {
  AssignmentSource,
  AssignmentType,
  FulfillmentMethod,
  OrderAssignmentStage,
  OrderItemType,
  OrderStatus,
} from '@repo/types';
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
import {
  DocumentSigningPublicDocumentTypes,
  GetOrderSigningSummaryQuery,
  OrderSigningSummaryReadModel,
} from 'src/modules/document-signing/public/queries/get-order-signing-summary.query';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import { Order } from 'src/modules/order/domain/entities/order.entity';
import { BundleSnapshot, BundleSnapshotComponent } from 'src/modules/order/domain/entities/bundle-snapshot.entity';
import { OrderItem } from 'src/modules/order/domain/entities/order-item.entity';
import {
  BundleNotFoundError,
  DeliveryNotSupportedForLocationError,
  InvalidBookingLocationError,
  InvalidPickupSlotError,
  InvalidReturnSlotError,
  OrderEditAfterPickupNotAllowedError,
  OrderEditNotAllowedError,
  OrderItemUnavailableError,
  OrderMustContainItemsError,
  OrderNotFoundError,
  OrderPricingTargetTotalInvalidError,
  OrderSignedEditNotAllowedError,
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

import { CreateOrderAssetResolver, buildDemandUnits } from '../create-order/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from '../create-order/create-order-owner-contract-resolver';
import { toPriceSnapshot } from '../create-order/create-order-pricing-snapshot.mapper';
import { ResolvedItem } from '../create-order/create-order.types';
import { TenantConfigNotFoundException } from '../../../domain/exceptions/order.exceptions';
import { EditOrderCommand } from './edit-order.command';

type EditOrderError =
  | BundleInactiveForBookingError
  | BundleNotBookableAtLocationError
  | BundleNotFoundError
  | CouponNotFoundError
  | CouponValidationError
  | DeliveryNotSupportedForLocationError
  | InvalidBookingLocationError
  | InvalidPickupSlotError
  | InvalidReturnSlotError
  | OrderEditAfterPickupNotAllowedError
  | OrderEditNotAllowedError
  | OrderItemUnavailableError
  | OrderMustContainItemsError
  | OrderNotFoundError
  | OrderPricingTargetTotalInvalidError
  | OrderSignedEditNotAllowedError
  | ProductTypeInactiveForBookingError
  | ProductTypeNotBookableAtLocationError
  | ProductTypeNotFoundError;

@CommandHandler(EditOrderCommand)
export class EditOrderService implements ICommandHandler<EditOrderCommand, Result<void, EditOrderError>> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly orderRepository: OrderRepository,
    private readonly pricingApi: PricingPublicApi,
    private readonly draftOrderPricingService: DraftOrderPricingService,
    private readonly inventoryApi: InventoryPublicApi,
    private readonly assetResolver: CreateOrderAssetResolver,
    private readonly ownerContractResolver: CreateOrderOwnerContractResolver,
  ) {}

  async execute(command: EditOrderCommand): Promise<Result<void, EditOrderError>> {
    const existingOrder = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!existingOrder) {
      return err(new OrderNotFoundError(command.orderId));
    }

    if (
      existingOrder.currentStatus !== OrderStatus.PENDING_REVIEW &&
      existingOrder.currentStatus !== OrderStatus.CONFIRMED
    ) {
      return err(new OrderEditNotAllowedError(existingOrder.currentStatus));
    }

    if (existingOrder.currentPeriod.start.getTime() <= Date.now()) {
      return err(new OrderEditAfterPickupNotAllowedError(existingOrder.id));
    }

    const signingSummary = await this.queryBus.execute<GetOrderSigningSummaryQuery, OrderSigningSummaryReadModel>(
      new GetOrderSigningSummaryQuery(
        command.tenantId,
        command.orderId,
        DocumentSigningPublicDocumentTypes.RENTAL_AGREEMENT,
      ),
    );

    if (signingSummary.status === 'SIGNED') {
      return err(new OrderSignedEditNotAllowedError(existingOrder.id));
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
        return err(error as EditOrderError);
      }

      throw error;
    }

    try {
      const transactionResult = await this.prisma.client.$transaction(async (tx) => {
        const replacementOrder = this.buildReplacementOrder({
          existingOrder,
          command,
          bookingContext,
          insuranceTerms,
        });

        if (existingOrder.currentStatus === OrderStatus.PENDING_REVIEW) {
          this.attachResolvedItemsToPendingReviewOrder(replacementOrder, resolvedItems);
          this.applyPricingAdjustment(replacementOrder, command, now);
          await this.orderRepository.save(replacementOrder, tx, { replaceChildren: true });
          return ok(undefined);
        }

        const assignmentStage = OrderAssignmentStage.COMMITTED;
        const demandUnits = buildDemandUnits(resolvedItems);

        await this.inventoryApi.releaseOrderAssignments(existingOrder.id, assignmentStage, tx);

        const availability = await this.assetResolver.resolveDemand(demandUnits, tx);

        if (availability.unavailableItems.length > 0 || availability.conflictGroups.length > 0) {
          return err(new OrderItemUnavailableError(availability.unavailableItems, availability.conflictGroups));
        }

        const contractByAssetId = await this.ownerContractResolver.resolve(
          command.tenantId,
          bookingContext.period.start,
          demandUnits,
        );
        const pendingAssignments = this.attachResolvedItemsToOperationalOrder(
          replacementOrder,
          resolvedItems,
          demandUnits,
          contractByAssetId,
          assignmentStage,
        );

        this.applyPricingAdjustment(replacementOrder, command, now);
        await this.orderRepository.save(replacementOrder, tx, { replaceChildren: true });

        const assignmentResults = await Promise.all(
          pendingAssignments.map((assignment) => this.inventoryApi.saveOrderAssignment(assignment, tx)),
        );

        if (assignmentResults.some((result) => result.isErr())) {
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

        return ok(undefined);
      });

      if (transactionResult.isErr()) {
        return err(transactionResult.error);
      }
    } catch (error) {
      if (error instanceof OrderPricingTargetTotalInvalidError) {
        return err(error);
      }

      throw error;
    }

    return ok(undefined);
  }

  private async validateLocation(
    command: EditOrderCommand,
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

  private async deriveBookingContext(command: EditOrderCommand): Promise<{
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

  private buildReplacementOrder(params: {
    existingOrder: Order;
    command: EditOrderCommand;
    bookingContext: {
      period: DateRange;
      insuranceEnabled: boolean;
      insuranceRatePercent: number;
      timezone: string;
    };
    insuranceTerms: ReturnType<typeof InsuranceCalculationService.resolveTerms>;
  }): Order {
    const { existingOrder, command, bookingContext, insuranceTerms } = params;

    return Order.reconstitute({
      id: existingOrder.id,
      tenantId: existingOrder.tenantId,
      locationId: command.locationId,
      customerId: command.customerId ?? null,
      period: bookingContext.period,
      status: existingOrder.currentStatus,
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
      reviewedAt: existingOrder.currentReviewedAt,
      reviewedByUserId: existingOrder.currentReviewedByUserId,
      rejectionReason: existingOrder.currentRejectionReason,
    });
  }

  private attachResolvedItemsToPendingReviewOrder(order: Order, resolvedItems: ResolvedItem[]): void {
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

  private attachResolvedItemsToOperationalOrder(
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

      const orderItemWithSnapshot = OrderItem.reconstitute({
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

  private applyPricingAdjustment(order: Order, command: EditOrderCommand, setAt: Date): void {
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
        throw new Error(`Order item '${orderItemId}' was not found during order edit pricing replacement.`);
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
