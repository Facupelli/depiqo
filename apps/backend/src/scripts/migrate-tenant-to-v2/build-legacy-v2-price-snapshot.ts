import Decimal from 'decimal.js';
import { z } from 'zod';

import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
  type AcceptedRentalPricingSnapshot,
} from '../../modules/rental-commitment/domain/value-objects/accepted-pricing-snapshot.type';

const LegacyFinancialSnapshotSchema = z.object({
  currency: z.string().min(1),
  subtotalBeforeDiscounts: z.string(),
  itemsDiscountTotal: z.string(),
  itemsSubtotal: z.string(),
  insuranceApplied: z.boolean(),
  insuranceAmount: z.string(),
  total: z.string(),
});

const LegacyDiscountSchema = z.object({
  sourceKind: z.string().optional(),
  sourceId: z.string().optional(),
  promotionId: z.string().optional(),
  ruleId: z.string().optional(),
  label: z.string().optional(),
  promotionLabel: z.string().optional(),
  ruleLabel: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  value: z.union([z.number(), z.string()]),
  discountAmount: z.string(),
});

const LegacyItemPriceSnapshotSchema = z.object({
  basePrice: z.string(),
  finalPrice: z.string(),
  totalUnits: z.number().int().positive(),
  pricePerBillingUnit: z.string(),
  discounts: z.array(LegacyDiscountSchema),
});

const LegacyManualPricingOverrideSchema = z.object({
  finalPrice: z.string(),
  setByUserId: z.string().nullable(),
  setAt: z.string().nullable(),
  previousFinalPrice: z.string().nullable(),
});

export type LegacyV2PriceSnapshotItem = {
  orderItemId: string;
  priceSnapshot: unknown;
  manualPricingOverride: unknown | null;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemName: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  ratePlanId?: string;
  appliedTierId?: string;
  manualOverrideActorId?: string;
};

export type DiscountMetadataOmissionReason =
  | 'missing_promotion_identity'
  | 'missing_label'
  | 'unsupported_source_kind';

export type DiscountMetadataOmission = {
  orderId: string;
  orderItemId: string;
  discountAmount: string;
  type: 'PERCENTAGE' | 'FLAT';
  value: string | number;
  availableSourceKind: string | null;
  reason: DiscountMetadataOmissionReason;
};

export type BuildLegacyV2PriceSnapshotInput = {
  orderId: string;
  financialSnapshot: unknown;
  effectiveTimezone: string;
  calculatedAt: Date;
  currencyOverride?: string;
  items: readonly LegacyV2PriceSnapshotItem[];
  onDiscountMetadataOmitted?: (entry: DiscountMetadataOmission) => void;
};

/**
 * Converts only persisted historical facts and migration-resolved identities.
 * It performs no lookups and deliberately does not invoke the current pricing engine.
 */
export function buildLegacyV2PriceSnapshot(
  input: BuildLegacyV2PriceSnapshotInput,
): AcceptedRentalPricingSnapshot {
  const financial = parseForOrder(LegacyFinancialSnapshotSchema, input.financialSnapshot, input.orderId, 'financialSnapshot');
  if (input.effectiveTimezone.trim().length === 0) {
    fail(input.orderId, 'effective migration timezone must be a non-empty string');
  }

  if (input.items.length === 0) fail(input.orderId, 'confirmed order has no items');

  const parsedItems = input.items.map((item) => ({
    migration: item,
    price: parseForOrder(LegacyItemPriceSnapshotSchema, item.priceSnapshot, input.orderId, `item ${item.orderItemId} priceSnapshot`),
    override:
      item.manualPricingOverride === null
        ? null
        : parseForOrder(
            LegacyManualPricingOverrideSchema,
            item.manualPricingOverride,
            input.orderId,
            `item ${item.orderItemId} manualPricingOverride`,
          ),
  }));

  const chargedDays = parsedItems[0]!.price.totalUnits;
  if (parsedItems.some((item) => item.price.totalUnits !== chargedDays)) {
    fail(input.orderId, 'selection totalUnits values disagree and cannot produce one V2 chargedDays value');
  }

  for (const item of parsedItems) {
    assertMoneyIdentity(
      input.orderId,
      `item ${item.migration.orderItemId} basePrice`,
      money(item.price.basePrice),
      money(item.price.pricePerBillingUnit).mul(item.price.totalUnits),
    );
    assertMoneyIdentity(
      input.orderId,
      `item ${item.migration.orderItemId} persisted discount sum`,
      money(item.price.basePrice).minus(item.price.finalPrice),
      sum(item.price.discounts.map((discount) => money(discount.discountAmount))),
    );
  }

  const subtotal = sum(parsedItems.map((item) => money(item.price.basePrice)));
  const calculatedTotal = sum(parsedItems.map((item) => money(item.price.finalPrice)));
  const finalTotal = sum(
    parsedItems.map((item) => money(item.override?.finalPrice ?? item.price.finalPrice)),
  );

  assertMoneyIdentity(input.orderId, 'item base-price sum vs legacy subtotalBeforeDiscounts', subtotal, money(financial.subtotalBeforeDiscounts));
  assertMoneyIdentity(input.orderId, 'effective item-total sum vs legacy itemsSubtotal', finalTotal, money(financial.itemsSubtotal));
  assertMoneyIdentity(
    input.orderId,
    'legacy subtotalBeforeDiscounts minus itemsSubtotal vs itemsDiscountTotal',
    money(financial.subtotalBeforeDiscounts).minus(financial.itemsSubtotal),
    money(financial.itemsDiscountTotal),
  );
  assertMoneyIdentity(
    input.orderId,
    'legacy total vs itemsSubtotal plus insuranceAmount',
    money(financial.total),
    money(financial.itemsSubtotal).plus(financial.insuranceAmount),
  );
  if (!financial.insuranceApplied) {
    assertMoneyIdentity(input.orderId, 'non-applied insurance amount', money(financial.insuranceAmount), money('0'));
  }

  const durationPolicySnapshot = {
    timezone: input.effectiveTimezone,
    // Legacy rentals did not persist these policy inputs consistently. The timezone can
    // be migration compatibility metadata resolved before conversion, while the remaining
    // deterministic values below are not recovered historical policy facts. Persisted
    // totalUnits remains authoritative and is never recalculated from this metadata.
    dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' as const,
    weekendCountsAsOne: false,
    minimumChargedDays: 0,
  };

  const itemsWithDiscountMetadata = parsedItems.map((item) => ({
    ...item,
    representedDiscounts: item.price.discounts.flatMap((discount) => {
      const representation = representLegacyDiscount(discount);
      if ('adjustment' in representation) return [representation];
      input.onDiscountMetadataOmitted?.({
        orderId: input.orderId,
        orderItemId: item.migration.orderItemId,
        discountAmount: money(discount.discountAmount).toString(),
        type: discount.type,
        value: discount.value,
        availableSourceKind: discount.sourceKind ?? null,
        reason: representation.reason,
      });
      return [];
    }),
  }));
  const calculatedLines = itemsWithDiscountMetadata.map((item) => buildLine(input.orderId, item, false));
  const finalLines = itemsWithDiscountMetadata.map((item) => buildLine(input.orderId, item, true));
  const appliedPromotions = buildAppliedPromotions(input.orderId, itemsWithDiscountMetadata);
  const currency = input.currencyOverride ?? financial.currency;
  const overrides = parsedItems.filter((item) => item.override !== null);

  const snapshot: AcceptedRentalPricingSnapshot = {
    schema: ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
    version: ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
    calculatedAtIso: input.calculatedAt.toISOString(),
    context: 'CONFIRMED',
    calculated: {
      currency,
      subtotal: subtotal.toString(),
      discountTotal: subtotal.minus(calculatedTotal).toString(),
      total: calculatedTotal.toString(),
      chargedDays,
      durationPolicySnapshot,
      lines: calculatedLines,
      appliedPromotions,
    },
    final: {
      currency,
      subtotal: subtotal.toString(),
      discountTotal: subtotal.minus(finalTotal).toString(),
      total: finalTotal.toString(),
      chargedDays,
      durationPolicySnapshot,
      lines: finalLines,
      appliedPromotions,
    },
    insurance: {
      applied: financial.insuranceApplied,
      amount: money(financial.insuranceAmount).toFixed(2),
    },
    totalBeforeInsurance: finalTotal.toString(),
    total: money(financial.total).toString(),
  };

  if (overrides.length > 0) {
    const actors = new Set(overrides.map((item) => item.migration.manualOverrideActorId));
    const timestamps = new Set(overrides.map((item) => item.override!.setAt));
    if (actors.size !== 1 || actors.has(undefined)) fail(input.orderId, 'manual overrides cannot be represented by one truthful V2 actor');
    if (timestamps.size !== 1 || timestamps.has(null)) fail(input.orderId, 'manual overrides cannot be represented by one truthful V2 timestamp');

    const setAt = [...timestamps][0]!;
    if (!Number.isFinite(Date.parse(setAt))) fail(input.orderId, `manual override setAt is invalid: ${setAt}`);

    const previousTotal = sum(
      parsedItems.map((item) => money(item.override?.previousFinalPrice ?? item.price.finalPrice)),
    );
    snapshot.manualPricingAdjustment = {
      mode: 'TARGET_TOTAL',
      targetTotal: finalTotal.toString(),
      previousTotal: previousTotal.toString(),
      direction: direction(previousTotal, finalTotal),
      adjustmentTotal: finalTotal.minus(previousTotal).abs().toString(),
      setByTenantUserId: [...actors][0]!,
      setAtIso: new Date(setAt).toISOString(),
    };
  }

  return snapshot;
}

type RepresentedLegacyDiscount = {
  adjustment: {
    type: 'PROMOTION';
    promotionId: string;
    name: string;
    amount: string;
  };
  effectType: 'PERCENTAGE_OFF' | 'FIXED_AMOUNT_OFF';
  effectValue: string;
};

type LegacyDiscountRepresentation =
  | RepresentedLegacyDiscount
  | {
      reason: DiscountMetadataOmissionReason;
      availableIdentity: string | null;
      availableLabel: string | null;
      availableSourceKind: string | null;
    };

function representLegacyDiscount(
  discount: z.infer<typeof LegacyDiscountSchema>,
): LegacyDiscountRepresentation {
  const promotionId = firstNonEmptyString(
    discount.sourceId,
    discount.promotionId,
    discount.ruleId,
  );
  const name = firstNonEmptyString(
    discount.label,
    discount.promotionLabel,
    discount.ruleLabel,
  );
  const sourceFacts = {
    availableIdentity: promotionId ?? null,
    availableLabel: name ?? null,
    availableSourceKind: discount.sourceKind ?? null,
  };

  if (!promotionId) return { reason: 'missing_promotion_identity', ...sourceFacts };
  if (!name) return { reason: 'missing_label', ...sourceFacts };
  if (discount.sourceKind && discount.sourceKind !== 'PROMOTION') {
    return { reason: 'unsupported_source_kind', ...sourceFacts };
  }

  return {
    adjustment: {
      type: 'PROMOTION',
      promotionId,
      name,
      amount: money(discount.discountAmount).toString(),
    },
    effectType: discount.type === 'PERCENTAGE' ? 'PERCENTAGE_OFF' : 'FIXED_AMOUNT_OFF',
    effectValue: String(discount.value),
  };
}

function buildLine(
  orderId: string,
  item: {
    migration: LegacyV2PriceSnapshotItem;
    price: z.infer<typeof LegacyItemPriceSnapshotSchema>;
    override: z.infer<typeof LegacyManualPricingOverrideSchema> | null;
    representedDiscounts: RepresentedLegacyDiscount[];
  },
  final: boolean,
): AcceptedRentalPricingSnapshot['final']['lines'][number] {
  const subtotal = money(item.price.basePrice);
  const calculatedTotal = money(item.price.finalPrice);
  const total = final && item.override ? money(item.override.finalPrice) : calculatedTotal;
  if (final && item.override) {
    if (!item.migration.manualOverrideActorId) {
      fail(orderId, `item ${item.migration.orderItemId} manual override has no mapped V2 actor`);
    }
    if (!item.override.setAt || !Number.isFinite(Date.parse(item.override.setAt))) {
      fail(orderId, `item ${item.migration.orderItemId} manual override has no valid historical setAt`);
    }
  }
  const adjustments = item.representedDiscounts.map(({ adjustment }) => adjustment);

  return {
    rentalSelectionId: item.migration.orderItemId,
    rentalOfferId: item.migration.rentalOfferId,
    rentableItemId: item.migration.rentableItemId,
    rentableItemName: item.migration.rentableItemName,
    quantity: 1,
    chargedUnits: item.price.totalUnits,
    billingUnit: item.migration.billingUnit,
    ...(item.migration.ratePlanId && item.migration.appliedTierId
      ? {
          ratePlanId: item.migration.ratePlanId,
          appliedTierId: item.migration.appliedTierId,
        }
      : {}),
    pricePerUnit: money(item.price.pricePerBillingUnit).toString(),
    subtotal: subtotal.toString(),
    discountTotal: subtotal.minus(total).toString(),
    total: total.toString(),
    appliedAdjustments: adjustments,
    ...(final && item.override
      ? {
          manualPricingAdjustment: {
            mode: 'TARGET_TOTAL_ALLOCATION' as const,
            direction: direction(money(item.override.previousFinalPrice ?? item.price.finalPrice), total),
            amount: total.minus(item.override.previousFinalPrice ?? item.price.finalPrice).abs().toString(),
            setByTenantUserId: item.migration.manualOverrideActorId!,
            setAtIso: new Date(item.override.setAt!).toISOString(),
          },
        }
      : {}),
  };
}

function buildAppliedPromotions(
  orderId: string,
  items: Array<{ representedDiscounts: RepresentedLegacyDiscount[] }>,
): AcceptedRentalPricingSnapshot['final']['appliedPromotions'] {
  const promotions = new Map<string, AcceptedRentalPricingSnapshot['final']['appliedPromotions'][number]>();
  for (const { representedDiscounts } of items) {
    for (const discount of representedDiscounts) {
      const candidate = {
        promotionId: discount.adjustment.promotionId,
        name: discount.adjustment.name,
        // Activation mode was not persisted in V1. AUTOMATIC is migration-only metadata.
        activation: 'AUTOMATIC' as const,
        effectType: discount.effectType,
        effectValue: discount.effectValue,
        target: 'ELIGIBLE_LINES' as const,
        amount: discount.adjustment.amount,
      };
      const promotionId = discount.adjustment.promotionId;
      const existing = promotions.get(promotionId);
      if (existing) {
        if (existing.name !== candidate.name || existing.effectType !== candidate.effectType || existing.effectValue !== candidate.effectValue) {
          fail(orderId, `promotion ${promotionId} has contradictory historical metadata`);
        }
        existing.amount = money(existing.amount).plus(candidate.amount).toString();
      } else {
        promotions.set(promotionId, candidate);
      }
    }
  }
  return [...promotions.values()];
}

function firstNonEmptyString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

function direction(previous: Decimal, next: Decimal): 'INCREASE' | 'DECREASE' | 'NONE' {
  return next.greaterThan(previous) ? 'INCREASE' : next.lessThan(previous) ? 'DECREASE' : 'NONE';
}

function money(value: Decimal.Value): Decimal {
  const parsed = new Decimal(value);
  if (!parsed.isFinite()) throw new Error(`Invalid historical money value: ${String(value)}`);
  return parsed;
}

function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), new Decimal(0));
}

function assertMoneyIdentity(orderId: string, identity: string, actual: Decimal, expected: Decimal): void {
  if (!actual.equals(expected)) fail(orderId, `${identity} failed: ${actual.toString()} != ${expected.toString()}`);
}

function parseForOrder<T extends z.ZodType>(schema: T, value: unknown, orderId: string, field: string): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) fail(orderId, `${field} is invalid: ${z.prettifyError(result.error)}`);
  return result.data;
}

function fail(orderId: string, message: string): never {
  throw new Error(`Cannot convert legacy pricing for order ${orderId}: ${message}`);
}
