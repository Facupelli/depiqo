import {
  GetRentalDetailPricingLineSchema,
  GetRentalDetailV2PricingSchema,
  type GetRentalDetailResponseDto,
} from '@repo/api-contracts';
import { z } from 'zod';

type V2Pricing = Extract<NonNullable<GetRentalDetailResponseDto['pricing']>, { kind: 'V2' }>;
type LegacyPricing = Extract<NonNullable<GetRentalDetailResponseDto['pricing']>, { kind: 'LEGACY' }>;

const V2PersistedPricingResultSchema = z.object({
  currency: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  total: z.string(),
  chargedDays: z.number(),
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
  schema: z.literal('v2.rental-price-snapshot'),
  version: z.literal(1),
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
