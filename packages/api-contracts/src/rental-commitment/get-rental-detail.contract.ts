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
	address: z.string(),
});

export const GetRentalDetailAcceptedDeliveryLocationSchema = z.object({
	formattedAddress: z.string(),
	latitude: z.number(),
	longitude: z.number(),
	addressLine1: z.string().optional(),
	addressLine2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	postalCode: z.string().optional(),
	country: z.string().optional(),
	providerPlaceId: z.string().optional(),
});

export const GetRentalDetailAcceptedDeliveryLegSchema = z.object({
	scheduledAt: z.string().datetime(),
	serviceLevel: z.enum(["NORMAL", "SPECIAL"]),
	basePrice: z.string(),
	surcharge: z.string(),
	total: z.string(),
});

export const GetRentalDetailAcceptedDeliverySchema = z.object({
	schema: z.literal("v2.accepted-delivery"),
	version: z.literal(1),
	resolvedCustomerLocation: GetRentalDetailAcceptedDeliveryLocationSchema,
	distanceMeters: z.number().int().nonnegative(),
	delivery: GetRentalDetailAcceptedDeliveryLegSchema,
	collection: GetRentalDetailAcceptedDeliveryLegSchema,
	currency: z.string(),
	deliveryTotal: z.string(),
	transportReservationMinutes: z.number().int().nonnegative(),
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
	"BILL_OVER_QUARTER_DAY",
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
	weekendCountsAsOne: z.boolean(),
	minimumChargedDays: z.number(),
	quarterDayThresholdMinutes: z.number().optional(),
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
	ratePlanId: z.string().min(1).optional(),
	appliedTierId: z.string().min(1).optional(),
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

export const GetRentalDetailInsuranceSchema = z.object({
	applied: z.boolean(),
	amount: z.string(),
});

export const GetRentalDetailV2PricingSchema = z.object({
	kind: z.literal("V2"),
	currency: z.string(),
	subtotal: z.string(),
	discountTotal: z.string(),
	insurance: GetRentalDetailInsuranceSchema,
	totalBeforeInsurance: z.string(),
	total: z.string(),
	chargedDays: z.number(),
	durationPolicySnapshot: GetRentalDetailDurationPolicySnapshotSchema,
	lines: z.array(GetRentalDetailPricingLineSchema),
	appliedPromotions: z.array(GetRentalDetailAppliedPromotionSchema),
	appliedCoupon: GetRentalDetailAppliedCouponSchema.nullable(),
	manualPricingAdjustment:
		GetRentalDetailManualPricingAdjustmentSchema.nullable(),
});

export const GetRentalDetailPricingSchema = GetRentalDetailV2PricingSchema;

export const GetRentalDetailOwnerPayoutLineSchema = z.object({
	rentalDemandLineId: z.string(),
	equipmentName: z.string(),
	quantity: z.number().int().positive(),
});

export const GetRentalDetailOwnerPayoutSchema = z.object({
	ownerId: z.string(),
	ownerName: z.string(),
	currency: z.string(),
	total: z.string(),
	lines: z.array(GetRentalDetailOwnerPayoutLineSchema),
});

export const GetRentalDetailResponseSchema = z.object({
	id: z.string(),
	rentalNumber: z.number().int().positive(),
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
		method: GetRentalsFulfillmentMethodSchema,
		deliveryDetails: GetRentalDetailDeliveryDetailsSchema.nullable(),
	}),
	selections: z.array(GetRentalDetailSelectionSchema),
	accessories: z.array(GetRentalDetailAccessorySchema),
	pricing: GetRentalDetailPricingSchema.nullable(),
	acceptedCustomerTotal: z.string().nullable(),
	acceptedDelivery: GetRentalDetailAcceptedDeliverySchema.nullable(),
	ownerPayouts: z.array(GetRentalDetailOwnerPayoutSchema),
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
export type GetRentalDetailAcceptedDeliveryLocationDto = z.infer<
	typeof GetRentalDetailAcceptedDeliveryLocationSchema
>;
export type GetRentalDetailAcceptedDeliveryLegDto = z.infer<
	typeof GetRentalDetailAcceptedDeliveryLegSchema
>;
export type GetRentalDetailAcceptedDeliveryDto = z.infer<
	typeof GetRentalDetailAcceptedDeliverySchema
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
export type GetRentalDetailInsuranceDto = z.infer<
	typeof GetRentalDetailInsuranceSchema
>;
export type GetRentalDetailV2PricingDto = z.infer<
	typeof GetRentalDetailV2PricingSchema
>;
export type GetRentalDetailPricingDto = z.infer<
	typeof GetRentalDetailPricingSchema
>;
export type GetRentalDetailOwnerPayoutLineDto = z.infer<
	typeof GetRentalDetailOwnerPayoutLineSchema
>;
export type GetRentalDetailOwnerPayoutDto = z.infer<
	typeof GetRentalDetailOwnerPayoutSchema
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
