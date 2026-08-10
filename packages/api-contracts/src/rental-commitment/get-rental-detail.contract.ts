import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { GetRentableItemsKindSchema } from "../catalog/get-rentable-items.contract";
import {
	GetRentalsFulfillmentMethodSchema,
	GetRentalsStatusSchema,
} from "./get-rentals.contract";

export const GetRentalDetailParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const GetRentalDetailPeriodSchema = z.object({
	start: z.string().datetime(),
	end: z.string().datetime(),
});

export const GetRentalDetailDeliveryDetailsSchema = z.object({
	addressLine1: z.string(),
	addressLine2: z.string().nullable(),
	city: z.string(),
	state: z.string().nullable(),
	postalCode: z.string().nullable(),
	country: z.string().nullable(),
	contactName: z.string().nullable(),
	contactPhone: z.string().nullable(),
	notes: z.string().nullable(),
});

export const GetRentalDetailAssignedAssetSchema = z.object({
	assetId: z.string(),
});

export const GetRentalDetailDemandLineSchema = z.object({
	id: z.string(),
	rentalSelectionId: z.string(),
	equipmentTypeId: z.string(),
	equipmentTypeName: z.string(),
	quantity: z.number().int().positive(),
	assignedAssets: z.array(GetRentalDetailAssignedAssetSchema),
});

export const GetRentalDetailSelectionSchema = z.object({
	id: z.string(),
	rentalOfferId: z.string(),
	rentableItemId: z.string(),
	rentableItemName: z.string(),
	rentableItemKind: GetRentableItemsKindSchema,
	quantity: z.number().int().positive(),
	demandLines: z.array(GetRentalDetailDemandLineSchema),
});

export const GetRentalDetailAccessorySchema = z.object({
	id: z.string(),
	sourceRentalDemandLineId: z.string().nullable(),
	equipmentTypeId: z.string(),
	equipmentTypeName: z.string(),
	quantity: z.number().int().positive(),
	assignedAssets: z.array(GetRentalDetailAssignedAssetSchema),
});

export const GetRentalDetailBillingUnitSchema = z.enum(["HOUR", "DAY", "WEEK"]);
export const GetRentalDetailDailyBillingPolicySchema = z.enum([
	"IGNORE_PARTIAL_DAY",
	"BILL_OVER_HALF_DAY",
	"BILL_ANY_PARTIAL_DAY",
]);
export const GetRentalDetailPricingAdjustmentTypeSchema = z.enum([
	"PROMOTION",
	"COUPON",
]);
export const GetRentalDetailPromotionActivationSchema = z.enum([
	"AUTOMATIC",
	"COUPON_REQUIRED",
]);
export const GetRentalDetailPromotionEffectTypeSchema = z.enum([
	"PERCENTAGE_OFF",
	"FIXED_AMOUNT_OFF",
]);
export const GetRentalDetailPromotionApplicationTargetSchema = z.enum([
	"ORDER",
	"ELIGIBLE_LINES",
]);

export const GetRentalDetailDurationPolicySnapshotSchema = z.object({
	timezone: z.string(),
	dailyBillingPolicy: GetRentalDetailDailyBillingPolicySchema,
	minimumChargedDays: z.number(),
	halfDayThresholdMinutes: z.number().optional(),
});

export const GetRentalDetailPricingLineAdjustmentSchema = z.object({
	type: GetRentalDetailPricingAdjustmentTypeSchema,
	promotionId: z.string(),
	couponId: z.string().optional(),
	name: z.string(),
	amount: z.string(),
});

export const GetRentalDetailManualPricingAdjustmentDirectionSchema = z.enum([
	"INCREASE",
	"DECREASE",
	"NONE",
]);

export const GetRentalDetailPricingLineManualPricingAdjustmentSchema = z.object({
	mode: z.literal("TARGET_TOTAL_ALLOCATION"),
	direction: GetRentalDetailManualPricingAdjustmentDirectionSchema,
	amount: z.string(),
	setByTenantUserId: z.string(),
	setAtIso: z.string().datetime(),
	reason: z.string().optional(),
});

export const GetRentalDetailManualPricingAdjustmentSchema = z.object({
	mode: z.literal("TARGET_TOTAL"),
	targetTotal: z.string(),
	previousTotal: z.string(),
	direction: GetRentalDetailManualPricingAdjustmentDirectionSchema,
	adjustmentTotal: z.string(),
	setByTenantUserId: z.string(),
	setAtIso: z.string().datetime(),
	reason: z.string().optional(),
});

export const GetRentalDetailPricingLineSchema = z.object({
	rentalOfferId: z.string(),
	rentableItemId: z.string(),
	rentableItemName: z.string(),
	categoryId: z.string().optional(),
	quantity: z.number(),
	chargedUnits: z.number(),
	billingUnit: GetRentalDetailBillingUnitSchema,
	ratePlanId: z.string(),
	appliedTierId: z.string(),
	pricePerUnit: z.string(),
	subtotal: z.string(),
	discountTotal: z.string(),
	total: z.string(),
	appliedAdjustments: z.array(GetRentalDetailPricingLineAdjustmentSchema),
	manualPricingAdjustment:
		GetRentalDetailPricingLineManualPricingAdjustmentSchema.nullable(),
});

export const GetRentalDetailAppliedPromotionSchema = z.object({
	promotionId: z.string(),
	name: z.string(),
	activation: GetRentalDetailPromotionActivationSchema,
	effectType: GetRentalDetailPromotionEffectTypeSchema,
	effectValue: z.string(),
	target: GetRentalDetailPromotionApplicationTargetSchema,
	amount: z.string(),
});

export const GetRentalDetailAppliedCouponSchema = z.object({
	couponId: z.string(),
	code: z.string(),
	promotionId: z.string(),
	amount: z.string(),
});

export const GetRentalDetailV2PricingSchema = z.object({
	kind: z.literal("V2"),
	currency: z.string(),
	subtotal: z.string(),
	discountTotal: z.string(),
	total: z.string(),
	chargedDays: z.number(),
	durationPolicySnapshot: GetRentalDetailDurationPolicySnapshotSchema,
	lines: z.array(GetRentalDetailPricingLineSchema),
	appliedPromotions: z.array(GetRentalDetailAppliedPromotionSchema),
	appliedCoupon: GetRentalDetailAppliedCouponSchema.nullable(),
	manualPricingAdjustment:
		GetRentalDetailManualPricingAdjustmentSchema.nullable(),
});

export const GetRentalDetailLegacyPricingDiscountSchema = z.object({
	label: z.string(),
	amount: z.string(),
});

export const GetRentalDetailLegacyPricingLineSchema = z.object({
	rentalSelectionId: z.string(),
	label: z.string(),
	basePrice: z.string(),
	finalPrice: z.string(),
	discounts: z.array(GetRentalDetailLegacyPricingDiscountSchema),
});

export const GetRentalDetailLegacyPricingSchema = z.object({
	kind: z.literal("LEGACY"),
	currency: z.string(),
	subtotalBeforeDiscounts: z.string(),
	discountTotal: z.string(),
	itemsSubtotal: z.string(),
	insuranceApplied: z.boolean(),
	insuranceAmount: z.string(),
	total: z.string(),
	lines: z.array(GetRentalDetailLegacyPricingLineSchema),
});

export const GetRentalDetailPricingSchema = z.discriminatedUnion("kind", [
	GetRentalDetailV2PricingSchema,
	GetRentalDetailLegacyPricingSchema,
]);

export const GetRentalDetailResponseSchema = z.object({
	id: z.string(),
	number: z.string(),
	status: GetRentalsStatusSchema,
	source: z.enum(["STAFF", "WHATSAPP_FLOW", "FORMAL"]).nullable(),
	notes: z.string().nullable(),
	insuranceSelected: z.boolean(),
	createdAt: z.string().datetime(),
	version: z.number().int().nonnegative(),
	updatedAt: z.string().datetime(),
	cancelledAt: z.string().datetime().nullable(),
	confirmedAt: z.string().datetime().nullable(),
	customerId: z.string().nullable(),
	branchId: z.string(),
	period: GetRentalDetailPeriodSchema,
	fulfillment: z.object({
		method: GetRentalsFulfillmentMethodSchema.nullable(),
		deliveryDetails: GetRentalDetailDeliveryDetailsSchema.nullable(),
	}),
	selections: z.array(GetRentalDetailSelectionSchema),
	accessories: z.array(GetRentalDetailAccessorySchema),
	pricing: GetRentalDetailPricingSchema.nullable(),
});

export type GetRentalDetailParamsDto = z.infer<
	typeof GetRentalDetailParamsSchema
>;
export type GetRentalDetailPeriodDto = z.infer<
	typeof GetRentalDetailPeriodSchema
>;
export type GetRentalDetailDeliveryDetailsDto = z.infer<
	typeof GetRentalDetailDeliveryDetailsSchema
>;
export type GetRentalDetailAssignedAssetDto = z.infer<
	typeof GetRentalDetailAssignedAssetSchema
>;
export type GetRentalDetailDemandLineDto = z.infer<
	typeof GetRentalDetailDemandLineSchema
>;
export type GetRentalDetailSelectionDto = z.infer<
	typeof GetRentalDetailSelectionSchema
>;
export type GetRentalDetailAccessoryDto = z.infer<
	typeof GetRentalDetailAccessorySchema
>;
export type GetRentalDetailBillingUnitDto = z.infer<
	typeof GetRentalDetailBillingUnitSchema
>;
export type GetRentalDetailDailyBillingPolicyDto = z.infer<
	typeof GetRentalDetailDailyBillingPolicySchema
>;
export type GetRentalDetailPricingAdjustmentTypeDto = z.infer<
	typeof GetRentalDetailPricingAdjustmentTypeSchema
>;
export type GetRentalDetailPromotionActivationDto = z.infer<
	typeof GetRentalDetailPromotionActivationSchema
>;
export type GetRentalDetailPromotionEffectTypeDto = z.infer<
	typeof GetRentalDetailPromotionEffectTypeSchema
>;
export type GetRentalDetailPromotionApplicationTargetDto = z.infer<
	typeof GetRentalDetailPromotionApplicationTargetSchema
>;
export type GetRentalDetailDurationPolicySnapshotDto = z.infer<
	typeof GetRentalDetailDurationPolicySnapshotSchema
>;
export type GetRentalDetailPricingLineAdjustmentDto = z.infer<
	typeof GetRentalDetailPricingLineAdjustmentSchema
>;
export type GetRentalDetailManualPricingAdjustmentDirectionDto = z.infer<
	typeof GetRentalDetailManualPricingAdjustmentDirectionSchema
>;
export type GetRentalDetailPricingLineManualPricingAdjustmentDto = z.infer<
	typeof GetRentalDetailPricingLineManualPricingAdjustmentSchema
>;
export type GetRentalDetailManualPricingAdjustmentDto = z.infer<
	typeof GetRentalDetailManualPricingAdjustmentSchema
>;
export type GetRentalDetailPricingLineDto = z.infer<
	typeof GetRentalDetailPricingLineSchema
>;
export type GetRentalDetailAppliedPromotionDto = z.infer<
	typeof GetRentalDetailAppliedPromotionSchema
>;
export type GetRentalDetailAppliedCouponDto = z.infer<
	typeof GetRentalDetailAppliedCouponSchema
>;
export type GetRentalDetailV2PricingDto = z.infer<
	typeof GetRentalDetailV2PricingSchema
>;
export type GetRentalDetailLegacyPricingDiscountDto = z.infer<
	typeof GetRentalDetailLegacyPricingDiscountSchema
>;
export type GetRentalDetailLegacyPricingLineDto = z.infer<
	typeof GetRentalDetailLegacyPricingLineSchema
>;
export type GetRentalDetailLegacyPricingDto = z.infer<
	typeof GetRentalDetailLegacyPricingSchema
>;
export type GetRentalDetailPricingDto = z.infer<
	typeof GetRentalDetailPricingSchema
>;
export type GetRentalDetailResponseDto = z.infer<
	typeof GetRentalDetailResponseSchema
>;

export const getRentalDetailContract = {
	method: "GET",
	path: "/rental-commitments/rentals/:rentalId",
	params: GetRentalDetailParamsSchema,
	response: GetRentalDetailResponseSchema,
} satisfies ApiContract<
	typeof GetRentalDetailParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof GetRentalDetailResponseSchema
>;
