import {
  GetRentalDetailPricingLineSchema,
  GetRentalDetailV2PricingSchema,
  type GetRentalDetailResponseDto,
} from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';

import type {
  RentalAcceptedPricingBillingUnit,
  RentalAcceptedPricingForDocuments,
} from '../../public-api/rental-commitment.public-api';
import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
} from '../../domain/value-objects/accepted-pricing-snapshot.type';

type V2Pricing = Extract<NonNullable<GetRentalDetailResponseDto['pricing']>, { kind: 'V2' }>;
type LegacyPricing = Extract<NonNullable<GetRentalDetailResponseDto['pricing']>, { kind: 'LEGACY' }>;

export type RentalAcceptedPricingDecodingErrorCode =
  | 'AcceptedPricingSnapshotInvalid'
  | 'AcceptedPricingUnitsIncomplete';

export interface RentalAcceptedPricingDecodingError {
  code: RentalAcceptedPricingDecodingErrorCode;
  message: string;
}

const V2PersistedPricingResultSchema = z.object({
  currency: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  total: z.string(),
  chargedDays: z.number().int().nonnegative(),
  durationPolicySnapshot: z.object({
    timezone: z.string(),
    dailyBillingPolicy: z.enum(['IGNORE_PARTIAL_DAY', 'BILL_OVER_HALF_DAY', 'BILL_ANY_PARTIAL_DAY']),
    minimumChargedDays: z.number(),
    halfDayThresholdMinutes: z.number().optional(),
  }),
  lines: z.array(
    GetRentalDetailPricingLineSchema.extend({
      manualPricingAdjustment: GetRentalDetailPricingLineSchema.shape.manualPricingAdjustment.optional(),
    }),
  ),
  appliedPromotions: z.array(
    z.object({
      promotionId: z.string(),
      name: z.string(),
      activation: z.enum(['AUTOMATIC', 'COUPON_REQUIRED']),
      effectType: z.enum(['PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF']),
      effectValue: z.string(),
      target: z.enum(['ORDER', 'ELIGIBLE_LINES']),
      amount: z.string(),
    }),
  ),
  appliedCoupon: z
    .object({
      couponId: z.string(),
      code: z.string(),
      promotionId: z.string(),
      amount: z.string(),
    })
    .optional(),
});

const V2RentalPriceSnapshotSchema = z.object({
  schema: z.literal(ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA),
  version: z.literal(ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION),
  calculated: V2PersistedPricingResultSchema,
  final: V2PersistedPricingResultSchema,
  manualPricingAdjustment: GetRentalDetailV2PricingSchema.shape.manualPricingAdjustment.optional(),
});

const LegacyDiscountSchema = z
  .object({
    label: z.string().optional(),
    promotionLabel: z.string().optional(),
    ruleLabel: z.string().optional(),
    discountAmount: z.string(),
  })
  .transform((discount) => {
    const label = [discount.label, discount.promotionLabel, discount.ruleLabel].find((value) => value?.trim().length);

    return label ? { label, amount: discount.discountAmount } : null;
  });

const LegacySelectionPriceSnapshotSchema = z.object({
  basePrice: z.string(),
  finalPrice: z.string(),
  discounts: z
    .array(LegacyDiscountSchema)
    .transform((discounts) =>
      discounts.filter((discount): discount is NonNullable<typeof discount> => discount !== null),
    ),
});

const LegacyFinancialSnapshotSchema = z.object({
  currency: z.string(),
  subtotalBeforeDiscounts: z.string(),
  itemsDiscountTotal: z.string(),
  itemsSubtotal: z.string(),
  insuranceApplied: z.boolean(),
  insuranceAmount: z.string(),
  total: z.string(),
});

export function parseV2RentalDetailPricing(value: unknown): V2Pricing | null {
  const snapshot = V2RentalPriceSnapshotSchema.safeParse(value);
  if (!snapshot.success) return null;

  const pricing = GetRentalDetailV2PricingSchema.safeParse({
    kind: 'V2',
    ...snapshot.data.final,
    lines: snapshot.data.final.lines.map((line) => ({
      ...line,
      manualPricingAdjustment: line.manualPricingAdjustment ?? null,
    })),
    appliedCoupon: snapshot.data.final.appliedCoupon ?? null,
    manualPricingAdjustment: snapshot.data.manualPricingAdjustment ?? null,
  });

  return pricing.success ? pricing.data : null;
}

export function parseLegacyRentalDetailPricing(value: unknown): LegacyPricing | null {
  const snapshot = LegacyFinancialSnapshotSchema.safeParse(value);
  if (!snapshot.success) return null;

  return {
    kind: 'LEGACY',
    currency: snapshot.data.currency,
    subtotalBeforeDiscounts: snapshot.data.subtotalBeforeDiscounts,
    discountTotal: snapshot.data.itemsDiscountTotal,
    itemsSubtotal: snapshot.data.itemsSubtotal,
    insuranceApplied: snapshot.data.insuranceApplied,
    insuranceAmount: snapshot.data.insuranceAmount,
    total: snapshot.data.total,
    lines: [],
  };
}

export function parseLegacyRentalDetailPricingLine(
  value: unknown,
): Omit<LegacyPricing['lines'][number], 'rentalSelectionId' | 'label'> | null {
  const snapshot = LegacySelectionPriceSnapshotSchema.safeParse(value);
  return snapshot.success ? snapshot.data : null;
}

export function decodeAcceptedPricingForDocuments(
  priceSnapshot: unknown,
  selectionPriceSnapshots: readonly unknown[],
): Result<RentalAcceptedPricingForDocuments, RentalAcceptedPricingDecodingError> {
  const v2Snapshot = V2RentalPriceSnapshotSchema.safeParse(priceSnapshot);
  if (v2Snapshot.success) {
    const total = resolveAcceptedPricingTotal(v2Snapshot.data.final.total, v2Snapshot.data.final.currency);
    if (total.isErr()) return err(total.error);

    return ok({
      total: total.value,
      chargedUnits: v2Snapshot.data.final.chargedDays,
      billingUnit: resolveV2BillingUnit(v2Snapshot.data.final.lines),
    });
  }

  const legacySnapshot = LegacyFinancialSnapshotSchema.safeParse(priceSnapshot);
  if (!legacySnapshot.success) {
    return err({
      code: 'AcceptedPricingSnapshotInvalid',
      message: 'The accepted pricing snapshot is neither a valid V2 nor migrated legacy snapshot.',
    });
  }

  const chargedUnits = resolveLegacyChargedUnits(selectionPriceSnapshots);
  if (chargedUnits.isErr()) {
    return err(chargedUnits.error);
  }

  const total = resolveAcceptedPricingTotal(legacySnapshot.data.total, legacySnapshot.data.currency);
  if (total.isErr()) return err(total.error);

  return ok({
    total: total.value,
    chargedUnits: chargedUnits.value,
  });
}

function resolveAcceptedPricingTotal(
  amount: string,
  currency: string,
): Result<RentalAcceptedPricingForDocuments['total'], RentalAcceptedPricingDecodingError> {
  if (!Number.isFinite(Number(amount)) || currency.trim().length === 0) {
    return err({
      code: 'AcceptedPricingSnapshotInvalid',
      message: 'The accepted pricing total or currency is invalid.',
    });
  }

  return ok({ amount, currency });
}

function resolveV2BillingUnit(
  lines: Array<{ billingUnit: RentalAcceptedPricingBillingUnit }>,
): RentalAcceptedPricingBillingUnit | undefined {
  const billingUnits = new Set(lines.map((line) => line.billingUnit));
  return billingUnits.size === 1 ? [...billingUnits][0] : undefined;
}

function resolveLegacyChargedUnits(
  selectionPriceSnapshots: readonly unknown[],
): Result<number, RentalAcceptedPricingDecodingError> {
  const chargedUnits: number[] = [];

  for (const priceSnapshot of selectionPriceSnapshots) {
    if (!isRecord(priceSnapshot) || !('totalUnits' in priceSnapshot)) {
      continue;
    }

    const value = priceSnapshot.totalUnits;
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return err({
        code: 'AcceptedPricingSnapshotInvalid',
        message: 'A migrated rental selection has an invalid totalUnits value.',
      });
    }

    chargedUnits.push(value);
  }

  if (chargedUnits.length === 0) {
    return err({
      code: 'AcceptedPricingUnitsIncomplete',
      message: 'Migrated accepted pricing has no rental selection totalUnits value.',
    });
  }

  if (new Set(chargedUnits).size !== 1) {
    return err({
      code: 'AcceptedPricingSnapshotInvalid',
      message: 'Migrated rental selection totalUnits values do not agree.',
    });
  }

  return ok(chargedUnits[0]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
