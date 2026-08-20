import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const DecimalStringSchema = z.string();

export const CalculateCartPriceSelectedOfferSchema = z.object({
  rentalOfferId: z.string(),
  quantity: z.number().int().positive(),
});

export const CalculateCartPriceBodySchema = z.object({
  branchId: z.string(),
  rentalPeriod: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
  selectedOffers: z.array(CalculateCartPriceSelectedOfferSchema),
  insuranceSelected: z.boolean().default(false),
  customerId: z.string().optional(),
  couponCode: z.string().trim().min(1).optional(),
});

export const CalculateCartPriceDurationPolicySnapshotSchema = z.object({
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
  target: z.enum(["ORDER", "ELIGIBLE_LINES"]),
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

export type CalculateCartPriceBodyDto = z.input<
  typeof CalculateCartPriceBodySchema
>;
export type CalculateCartPriceResponseDto = z.infer<
  typeof CalculateCartPriceResponseSchema
>;

export const calculateCartPriceContract = {
  method: "POST",
  path: "/storefront/pricing/cart/price",
  body: CalculateCartPriceBodySchema,
  response: CalculateCartPriceResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CalculateCartPriceBodySchema,
  typeof CalculateCartPriceResponseSchema
>;
