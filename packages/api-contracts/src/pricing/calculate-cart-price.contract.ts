import { z } from "zod";

const DecimalStringSchema = z.string();

export const CalculateCartPriceDurationPolicySnapshotSchema = z.object({
  timezone: z.string(),
  dailyBillingPolicy: z.enum([
    "IGNORE_PARTIAL_DAY",
    "BILL_OVER_QUARTER_DAY",
    "BILL_OVER_HALF_DAY",
    "BILL_ANY_PARTIAL_DAY",
  ]),
  weekendCountsAsOne: z.boolean(),
  minimumChargedDays: z.number().int(),
  quarterDayThresholdMinutes: z.number().int().optional(),
  halfDayThresholdMinutes: z.number().int().optional(),
});

export const CalculateCartPriceLineAdjustmentSchema = z.object({
  type: z.enum(["PROMOTION", "COUPON"]),
  promotionId: z.string(),
  couponId: z.string().optional(),
  name: z.string(),
  amount: DecimalStringSchema,
});

export const CalculateCartPriceLineSchema = z.object({
  rentalOfferId: z.string(),
  rentableItemId: z.string(),
  rentableItemName: z.string(),
  categoryId: z.string().optional(),
  quantity: z.number().int().positive(),
  chargedUnits: z.number().int().positive(),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  ratePlanId: z.string(),
  appliedTierId: z.string(),
  pricePerUnit: DecimalStringSchema,
  subtotal: DecimalStringSchema,
  discountTotal: DecimalStringSchema,
  total: DecimalStringSchema,
  appliedAdjustments: z.array(CalculateCartPriceLineAdjustmentSchema),
});

export const CalculateCartPriceAppliedPromotionSchema = z.object({
  promotionId: z.string(),
  name: z.string(),
  activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]),
  effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]),
  effectValue: DecimalStringSchema,
  amount: DecimalStringSchema,
});

export const CalculateCartPriceAppliedCouponSchema = z.object({
  couponId: z.string(),
  code: z.string(),
  promotionId: z.string(),
  amount: DecimalStringSchema,
});

export const CalculateCartPriceInsuranceSchema = z.object({
  selected: z.boolean(),
  applied: z.boolean(),
  ratePercent: DecimalStringSchema,
  amount: DecimalStringSchema,
});

export const CalculateCartPriceResponseSchema = z.object({
  currency: z.string().nullable(),
  locale: z.string(),
  subtotal: DecimalStringSchema,
  discountTotal: DecimalStringSchema,
  totalBeforeInsurance: DecimalStringSchema,
  chargedDays: z.number().int().nonnegative(),
  insurance: CalculateCartPriceInsuranceSchema,
  total: DecimalStringSchema,
  durationPolicySnapshot:
    CalculateCartPriceDurationPolicySnapshotSchema.nullable(),
  lines: z.array(CalculateCartPriceLineSchema),
  appliedPromotions: z.array(CalculateCartPriceAppliedPromotionSchema),
  appliedCoupon: CalculateCartPriceAppliedCouponSchema.nullable(),
});

export type CalculateCartPriceResponseDto = z.infer<
  typeof CalculateCartPriceResponseSchema
>;
