import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const DecimalStringSchema = z.string();

export const CalculateDraftRentalPriceSelectedOfferSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const CalculateDraftRentalPriceManualPricingAdjustmentSchema = z.object({
  mode: z.literal("TARGET_TOTAL"),
  targetTotal: z.string().trim().min(1),
  reason: z.string().trim().optional(),
});

export const CalculateDraftRentalPriceBodySchema = z.object({
  branchId: z.string().trim().min(1),
  rentalCustomerId: z.string().trim().min(1).optional(),
  period: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
  selectedOffers: z.array(CalculateDraftRentalPriceSelectedOfferSchema).min(1),
  manualPricingAdjustment:
    CalculateDraftRentalPriceManualPricingAdjustmentSchema.optional(),
});

export const CalculateDraftRentalPriceDurationPolicySnapshotSchema = z.object({
  timezone: z.string(),
  dailyBillingPolicy: z.enum([
    "IGNORE_PARTIAL_DAY",
    "BILL_OVER_HALF_DAY",
    "BILL_ANY_PARTIAL_DAY",
  ]),
  minimumChargedDays: z.number().int(),
  halfDayThresholdMinutes: z.number().int().optional(),
});

export const CalculateDraftRentalPriceLineManualPricingAdjustmentSchema =
  z.object({
    mode: z.literal("TARGET_TOTAL_ALLOCATION"),
    direction: z.enum(["INCREASE", "DECREASE", "NONE"]),
    amount: DecimalStringSchema,
    setByTenantUserId: z.string(),
    setAtIso: z.string().datetime(),
    reason: z.string().optional(),
  });

export const CalculateDraftRentalPriceLineAdjustmentSchema = z.object({
  type: z.enum(["PROMOTION", "COUPON"]),
  promotionId: z.string(),
  couponId: z.string().optional(),
  name: z.string(),
  amount: DecimalStringSchema,
});

export const CalculateDraftRentalPriceLineSchema = z.object({
  rentalSelectionId: z.string(),
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
  appliedAdjustments: z.array(CalculateDraftRentalPriceLineAdjustmentSchema),
  manualPricingAdjustment:
    CalculateDraftRentalPriceLineManualPricingAdjustmentSchema.optional(),
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

export const CalculateDraftRentalPricePricingResultSchema = z.object({
  currency: z.string(),
  subtotal: DecimalStringSchema,
  discountTotal: DecimalStringSchema,
  total: DecimalStringSchema,
  chargedDays: z.number().int().nonnegative(),
  lines: z.array(CalculateDraftRentalPriceLineSchema),
  durationPolicySnapshot: CalculateDraftRentalPriceDurationPolicySnapshotSchema,
  appliedPromotions: z.array(CalculateDraftRentalPriceAppliedPromotionSchema),
  appliedCoupon: CalculateDraftRentalPriceAppliedCouponSchema.optional(),
});

export const CalculateDraftRentalPriceManualPricingAdjustmentSnapshotSchema =
  z.object({
    mode: z.literal("TARGET_TOTAL"),
    targetTotal: DecimalStringSchema,
    previousTotal: DecimalStringSchema,
    direction: z.enum(["INCREASE", "DECREASE", "NONE"]),
    adjustmentTotal: DecimalStringSchema,
    setByTenantUserId: z.string(),
    setAtIso: z.string().datetime(),
    reason: z.string().optional(),
  });

export const CalculateDraftRentalPriceResponseSchema = z.object({
  schema: z.literal("v2.rental-price-snapshot"),
  version: z.literal(1),
  calculatedAtIso: z.string().datetime(),
  context: z.enum(["DRAFT", "CONFIRMED", "CONFIRM_DRAFT", "REPRICE"]),
  calculated: CalculateDraftRentalPricePricingResultSchema,
  final: CalculateDraftRentalPricePricingResultSchema,
  manualPricingAdjustment:
    CalculateDraftRentalPriceManualPricingAdjustmentSnapshotSchema.optional(),
});

export type CalculateDraftRentalPriceSelectedOfferDto = z.infer<
  typeof CalculateDraftRentalPriceSelectedOfferSchema
>;
export type CalculateDraftRentalPriceManualPricingAdjustmentDto = z.infer<
  typeof CalculateDraftRentalPriceManualPricingAdjustmentSchema
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
