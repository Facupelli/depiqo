import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const DecimalStringSchema = z.string();

export const CalculateDraftRentalPriceSelectedOfferSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const CalculateDraftRentalPriceTargetTotalAdjustmentSchema = z.object({
  mode: z.literal("TARGET_TOTAL"),
  targetTotal: z.string().trim().min(1),
});

export const CalculateDraftRentalPriceBodySchema = z.object({
  branchId: z.string().trim().min(1),
  rentalCustomerId: z.string().trim().min(1).optional(),
  period: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
  selectedOffers: z.array(CalculateDraftRentalPriceSelectedOfferSchema).min(1),
  targetTotalAdjustment:
    CalculateDraftRentalPriceTargetTotalAdjustmentSchema.optional(),
});

export const CalculateDraftRentalPriceDurationPolicySchema = z.object({
  timezone: z.string(),
  dailyBillingPolicy: z.enum([
    "IGNORE_PARTIAL_DAY",
    "BILL_OVER_HALF_DAY",
    "BILL_ANY_PARTIAL_DAY",
  ]),
  weekendCountsAsOne: z.boolean(),
  minimumChargedDays: z.number().int(),
  halfDayThresholdMinutes: z.number().int().optional(),
});

export const CalculateDraftRentalPriceLineAdjustmentSchema = z.object({
  type: z.string(),
  promotionId: z.string(),
  couponId: z.string().optional(),
  name: z.string(),
  amount: DecimalStringSchema,
});

export const CalculateDraftRentalPriceLineSchema = z.object({
  lineReference: z.string(),
  rentalOfferId: z.string(),
  rentableItemId: z.string(),
  categoryId: z.string().optional(),
  quantity: z.number().int().positive(),
  chargedUnits: z.number().int().positive(),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  ratePlanId: z.string(),
  appliedTier: z.object({
    tierId: z.string(),
    fromUnit: z.number().int(),
    toUnit: z.number().int().nullable(),
    pricePerUnit: DecimalStringSchema,
  }),
  subtotal: DecimalStringSchema,
  discountTotal: DecimalStringSchema,
  total: DecimalStringSchema,
  appliedAdjustments: z.array(CalculateDraftRentalPriceLineAdjustmentSchema),
  targetTotalAllocation: z
    .object({
      direction: z.enum(["INCREASE", "DECREASE", "NONE"]),
      amount: DecimalStringSchema,
    })
    .optional(),
});

export const CalculateDraftRentalPriceAppliedPromotionSchema = z.object({
  promotionId: z.string(),
  name: z.string(),
  activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]),
  effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]),
  effectValue: DecimalStringSchema,
  target: z.enum(["ORDER", "ELIGIBLE_LINES"]),
  amount: DecimalStringSchema,
});

export const CalculateDraftRentalPriceAppliedCouponSchema = z.object({
  couponId: z.string(),
  code: z.string(),
  promotionId: z.string(),
  amount: DecimalStringSchema,
});

export const CalculateDraftRentalPriceBreakdownSchema = z.object({
  currency: z.string(),
  subtotal: DecimalStringSchema,
  discountTotal: DecimalStringSchema,
  total: DecimalStringSchema,
  chargedDays: z.number().int().nonnegative(),
  lines: z.array(CalculateDraftRentalPriceLineSchema),
  durationPolicy: CalculateDraftRentalPriceDurationPolicySchema,
  appliedPromotions: z.array(CalculateDraftRentalPriceAppliedPromotionSchema),
  appliedCoupon: CalculateDraftRentalPriceAppliedCouponSchema.optional(),
});

export const CalculateDraftRentalPriceTargetTotalAdjustmentResultSchema = z.object({
  targetTotal: DecimalStringSchema,
  previousTotal: DecimalStringSchema,
  direction: z.enum(["INCREASE", "DECREASE", "NONE"]),
  adjustmentTotal: DecimalStringSchema,
});

export const CalculateDraftRentalPriceResponseSchema = z.object({
  calculatedAtIso: z.string().datetime(),
  calculated: CalculateDraftRentalPriceBreakdownSchema,
  final: CalculateDraftRentalPriceBreakdownSchema,
  targetTotalAdjustment:
    CalculateDraftRentalPriceTargetTotalAdjustmentResultSchema.optional()
});

export type CalculateDraftRentalPriceSelectedOfferDto = z.infer<
  typeof CalculateDraftRentalPriceSelectedOfferSchema
>;
export type CalculateDraftRentalPriceTargetTotalAdjustmentDto = z.infer<
  typeof CalculateDraftRentalPriceTargetTotalAdjustmentSchema
>;
export type CalculateDraftRentalPriceBodyDto = z.input<
  typeof CalculateDraftRentalPriceBodySchema
>;
export type CalculateDraftRentalPriceResponseDto = z.infer<
  typeof CalculateDraftRentalPriceResponseSchema
>;

export const calculateDraftRentalPriceContract = {
  method: "POST",
  path: "/pricing/draft-rentals/price",
  body: CalculateDraftRentalPriceBodySchema,
  response: CalculateDraftRentalPriceResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CalculateDraftRentalPriceBodySchema,
  typeof CalculateDraftRentalPriceResponseSchema
>;
