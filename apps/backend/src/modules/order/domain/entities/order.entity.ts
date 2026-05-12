import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { FulfillmentMethod } from '@repo/types';
import { OrderItem } from './order-item.entity';
import {
  InvalidOrderStatusTransitionException,
  MissingOrderDeliveryRequestException,
  OrderItemNotAllowedException,
  OrderItemNotFoundException,
  OrderPriceAdjustmentNotAllowedException,
  SettledOwnerSplitCancellationBlockedException,
} from '../exceptions/order.exceptions';
import { OrderStatus } from '@repo/types';
import { OrderFinancialSnapshot } from '../value-objects/order-financial-snapshot.value-object';
import { OrderDeliveryRequest } from '../value-objects/order-delivery-request.value-object';
import { BookingSnapshot } from '../value-objects/booking-snapshot.value-object';
import { ManualPricingOverride } from '../value-objects/manual-pricing-override.value-object';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_REVIEW]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.EXPIRED],
  [OrderStatus.CONFIRMED]: [OrderStatus.ACTIVE, OrderStatus.CANCELLED],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.EXPIRED]: [],
  [OrderStatus.ACTIVE]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export interface CreateOrderProps {
  tenantId: string;
  locationId: string;
  currency: string;
  period: DateRange;
  status: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  deliveryRequest?: OrderDeliveryRequest | null;
  bookingSnapshot: BookingSnapshot;
  insuranceSelected: boolean;
  insuranceRatePercent: number;
  customerId?: string;
  notes?: string;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
  rejectionReason?: string | null;
}

export interface ReconstituteOrderProps {
  id: string;
  tenantId: string;
  locationId: string;
  customerId: string | null;
  period: DateRange;
  status: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  deliveryRequest: OrderDeliveryRequest | null;
  bookingSnapshot: BookingSnapshot | null;
  insuranceSelected: boolean;
  financialSnapshot: OrderFinancialSnapshot;
  notes: string | null;
  items: OrderItem[];
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
  rejectionReason?: string | null;
}

export class Order {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly locationId: string,
    public readonly customerId: string | null,
    private period: DateRange,
    private status: OrderStatus,
    private readonly fulfillmentMethod: FulfillmentMethod,
    private readonly deliveryRequest: OrderDeliveryRequest | null,
    private readonly bookingSnapshot: BookingSnapshot | null,
    private readonly insuranceSelected: boolean,
    private readonly insuranceRatePercent: number,
    private financialSnapshot: OrderFinancialSnapshot,
    private notes: string | null,
    private readonly items: OrderItem[],
    private reviewedAt: Date | null,
    private reviewedByUserId: string | null,
    private rejectionReason: string | null,
  ) {}

  static create(props: CreateOrderProps): Order {
    return new Order(
      randomUUID(),
      props.tenantId,
      props.locationId,
      props.customerId ?? null,
      props.period,
      props.status,
      props.fulfillmentMethod,
      Order.assertDeliveryRequest(props.fulfillmentMethod, props.deliveryRequest ?? null),
      props.bookingSnapshot,
      props.insuranceSelected,
      props.insuranceRatePercent,
      OrderFinancialSnapshot.zero(props.currency, props.insuranceSelected, props.insuranceRatePercent),
      props.notes?.trim() ?? null,
      [],
      props.reviewedAt ?? null,
      props.reviewedByUserId ?? null,
      props.rejectionReason?.trim() ?? null,
    );
  }

  static reconstitute(props: ReconstituteOrderProps): Order {
    return new Order(
      props.id,
      props.tenantId,
      props.locationId,
      props.customerId,
      props.period,
      props.status,
      props.fulfillmentMethod,
      Order.assertDeliveryRequest(props.fulfillmentMethod, props.deliveryRequest),
      props.bookingSnapshot,
      props.insuranceSelected,
      props.financialSnapshot.insuranceRatePercent,
      props.financialSnapshot,
      props.notes,
      props.items,
      props.reviewedAt ?? null,
      props.reviewedByUserId ?? null,
      props.rejectionReason?.trim() ?? null,
    );
  }

  get currentStatus(): OrderStatus {
    return this.status;
  }

  get currentPeriod(): DateRange {
    return this.period;
  }

  get currentNotes(): string | null {
    return this.notes;
  }

  get currentFulfillmentMethod(): FulfillmentMethod {
    return this.fulfillmentMethod;
  }

  get currentDeliveryRequest(): OrderDeliveryRequest | null {
    return this.deliveryRequest;
  }

  get currentBookingSnapshot(): BookingSnapshot | null {
    return this.bookingSnapshot;
  }

  get currentInsuranceSelected(): boolean {
    return this.insuranceSelected;
  }

  get currentFinancialSnapshot(): OrderFinancialSnapshot {
    return this.financialSnapshot;
  }

  get currentReviewedAt(): Date | null {
    return this.reviewedAt;
  }

  get currentReviewedByUserId(): string | null {
    return this.reviewedByUserId;
  }

  get currentRejectionReason(): string | null {
    return this.rejectionReason;
  }

  getItems(): OrderItem[] {
    return [...this.items];
  }

  updateNotes(notes: string | null): void {
    this.notes = notes?.trim() ?? null;
  }

  addItem(item: OrderItem): void {
    if (
      this.status === OrderStatus.ACTIVE ||
      this.status === OrderStatus.COMPLETED ||
      this.status === OrderStatus.CANCELLED
    ) {
      throw new OrderItemNotAllowedException(this.status);
    }
    this.items.push(item);
    this.recalculateFinancialSnapshot();
  }

  removeItem(itemId: string, assetId: string): void {
    const idx = this.items.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      throw new OrderItemNotFoundException(itemId);
    }
    this.items[idx].voidOwnerSplitForAsset(assetId);
    this.items.splice(idx, 1);
    this.recalculateFinancialSnapshot();
  }

  replaceItemManualPricingOverride(itemId: string, manualPricingOverride: ManualPricingOverride | null): void {
    this.assertCanAdjustPricing();

    const item = this.items.find((candidate) => candidate.id === itemId);
    if (!item) {
      throw new OrderItemNotFoundException(itemId);
    }

    item.replaceManualPricingOverride(manualPricingOverride);
    this.recalculateFinancialSnapshot();
  }

  transitionTo(next: OrderStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.status];
    if (!allowed.includes(next)) {
      throw new InvalidOrderStatusTransitionException(this.status, next);
    }
    this.status = next;
  }

  cancel(): void {
    this.assertCanCancel();
    this.items.forEach((item) => item.voidAllOwnerSplits());
    this.transitionTo(OrderStatus.CANCELLED);
  }

  confirm(reviewedByUserId?: string): void {
    if (this.status === OrderStatus.PENDING_REVIEW) {
      this.reviewedAt = new Date();
      this.reviewedByUserId = reviewedByUserId ?? null;
      this.rejectionReason = null;
    }

    this.transitionTo(OrderStatus.CONFIRMED);
  }

  reject(reviewedByUserId?: string, rejectionReason?: string | null): void {
    if (this.status === OrderStatus.PENDING_REVIEW) {
      this.reviewedAt = new Date();
      this.reviewedByUserId = reviewedByUserId ?? null;
      this.rejectionReason = rejectionReason?.trim() || null;
    }

    this.transitionTo(OrderStatus.REJECTED);
  }

  expire(): void {
    this.transitionTo(OrderStatus.EXPIRED);
  }

  activate(): void {
    this.transitionTo(OrderStatus.ACTIVE);
  }

  complete(): void {
    this.transitionTo(OrderStatus.COMPLETED);
  }

  private recalculateFinancialSnapshot(): void {
    const currency = this.items[0]?.calculatedPriceSnapshot.currency ?? this.financialSnapshot.currency;

    const subtotalBeforeDiscounts = this.items.reduce(
      (sum, item) => sum.plus(item.calculatedPriceSnapshot.basePrice),
      new Decimal(0),
    );
    const itemsSubtotal = this.items.reduce((sum, item) => sum.plus(item.effectiveFinalPrice), new Decimal(0));
    const itemsDiscountTotal = subtotalBeforeDiscounts.minus(itemsSubtotal);
    const insurance = InsuranceCalculationService.calculate(subtotalBeforeDiscounts, {
      insuranceSelected: this.insuranceSelected,
      insuranceRatePercent: this.insuranceRatePercent,
    });

    this.financialSnapshot = OrderFinancialSnapshot.create({
      currency,
      subtotalBeforeDiscounts,
      itemsDiscountTotal,
      itemsSubtotal,
      insuranceApplied: insurance.insuranceApplied,
      insuranceRatePercent: insurance.insuranceRatePercent,
      insuranceAmount: insurance.insuranceAmount,
      total: itemsSubtotal.plus(insurance.insuranceAmount),
    });
  }

  private assertCanCancel(): void {
    const allowed = ALLOWED_TRANSITIONS[this.status];
    if (!allowed.includes(OrderStatus.CANCELLED)) {
      throw new InvalidOrderStatusTransitionException(this.status, OrderStatus.CANCELLED);
    }

    const hasSettledOwnerSplits = this.items.some((item) => item.ownerSplits.some((split) => split.isSettled()));
    if (hasSettledOwnerSplits) {
      throw new SettledOwnerSplitCancellationBlockedException();
    }
  }

  private assertCanAdjustPricing(): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new OrderPriceAdjustmentNotAllowedException(this.status);
    }
  }

  private static assertDeliveryRequest(
    fulfillmentMethod: FulfillmentMethod,
    deliveryRequest: OrderDeliveryRequest | null,
  ): OrderDeliveryRequest | null {
    if (fulfillmentMethod === FulfillmentMethod.DELIVERY) {
      if (!deliveryRequest) {
        throw new MissingOrderDeliveryRequestException();
      }

      return deliveryRequest;
    }

    return null;
  }
}
