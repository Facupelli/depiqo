import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  GetRentableItemsBillingUnitSchema,
  GetRentableItemsKindSchema,
  GetRentableItemsStatusSchema,
} from "./get-rentable-items.contract";

export const GetRentableItemDetailParamsSchema = z.object({
  rentableItemId: z.string().trim().min(1),
});

export const GetRentableItemDetailRequiredEquipmentSchema = z.object({
  equipmentTypeId: z.string(),
  equipmentTypeName: z.string().nullable(),
  equipmentTypeDescription: z.string().nullable(),
  quantityPerItem: z.number().int().positive(),
  notes: z.string().nullable(),
});

export const GetRentableItemDetailRatePlanTierSchema = z.object({
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable(),
  pricePerUnit: z.string(),
});

export const GetRentableItemDetailActiveRatePlanSchema = z.object({
  rentalOfferPricingId: z.string(),
  ratePlanId: z.string(),
  ratePlanName: z.string(),
  currency: z.string(),
  billingUnit: GetRentableItemsBillingUnitSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  tiers: z.array(GetRentableItemDetailRatePlanTierSchema),
});

export const GetRentableItemDetailOfferSetupStatusSchema = z.enum([
  "BRANCH_UNAVAILABLE",
  "MISSING_PRICING",
  "INVALID_PRICING",
  "NOT_RENTABLE",
  "NOT_VISIBLE",
  "READY",
]);

export const GetRentableItemDetailOfferSetupIssueSchema = z.enum([
  "BRANCH_INACTIVE",
  "BRANCH_UNAVAILABLE",
  "MISSING_PRICING",
  "PRICING_ASSIGNMENT_INACTIVE",
  "RATE_PLAN_INACTIVE",
  "NO_VALID_TIERS",
  "OFFER_NOT_RENTABLE",
  "OFFER_NOT_VISIBLE",
]);

export const GetRentableItemDetailOfferSetupActionSchema = z.enum(["ASSIGN_PRICE", "EDIT_PRICING"]);

export const GetRentableItemDetailOfferPriceSummarySchema = z.object({
  ratePlanId: z.string(),
  ratePlanName: z.string(),
  startingPrice: z.string(),
  currency: z.string(),
  billingUnit: GetRentableItemsBillingUnitSchema,
});

export const GetRentableItemDetailOfferSetupSummarySchema = z.object({
  status: GetRentableItemDetailOfferSetupStatusSchema,
  issues: z.array(GetRentableItemDetailOfferSetupIssueSchema),
  priceSummary: GetRentableItemDetailOfferPriceSummarySchema.nullable(),
  availableActions: z.array(GetRentableItemDetailOfferSetupActionSchema),
});

export const GetRentableItemDetailOfferSchema = z.object({
  rentalOfferId: z.string(),
  branchId: z.string(),
  branchName: z.string().nullable(),
  timezone: z.string().nullable(),
  supportsDelivery: z.boolean().nullable(),
  isVisible: z.boolean(),
  isRentable: z.boolean(),
  updatedAt: z.string().datetime(),
  activeRatePlan: GetRentableItemDetailActiveRatePlanSchema.nullable(),
  setupSummary: GetRentableItemDetailOfferSetupSummarySchema,
  physicalStockCapacity: z.number().int().nonnegative(),
});

export const GetRentableItemDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: GetRentableItemsKindSchema,
  status: GetRentableItemsStatusSchema,
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  requiredEquipment: z.array(GetRentableItemDetailRequiredEquipmentSchema),
  offers: z.array(GetRentableItemDetailOfferSchema),
});

export type GetRentableItemDetailParamsDto = z.infer<typeof GetRentableItemDetailParamsSchema>;
export type GetRentableItemDetailRequiredEquipmentDto = z.infer<
  typeof GetRentableItemDetailRequiredEquipmentSchema
>;
export type GetRentableItemDetailRatePlanTierDto = z.infer<typeof GetRentableItemDetailRatePlanTierSchema>;
export type GetRentableItemDetailActiveRatePlanDto = z.infer<typeof GetRentableItemDetailActiveRatePlanSchema>;
export type GetRentableItemDetailOfferSetupStatusDto = z.infer<
  typeof GetRentableItemDetailOfferSetupStatusSchema
>;
export type GetRentableItemDetailOfferSetupIssueDto = z.infer<typeof GetRentableItemDetailOfferSetupIssueSchema>;
export type GetRentableItemDetailOfferSetupActionDto = z.infer<typeof GetRentableItemDetailOfferSetupActionSchema>;
export type GetRentableItemDetailOfferSetupSummaryDto = z.infer<typeof GetRentableItemDetailOfferSetupSummarySchema>;
export type GetRentableItemDetailOfferDto = z.infer<typeof GetRentableItemDetailOfferSchema>;
export type GetRentableItemDetailResponseDto = z.infer<typeof GetRentableItemDetailResponseSchema>;

export const getRentableItemDetailContract = {
  method: "GET",
  path: "/catalog/rentable-items/:rentableItemId",
  params: GetRentableItemDetailParamsSchema,
  response: GetRentableItemDetailResponseSchema,
} satisfies ApiContract<
  typeof GetRentableItemDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetRentableItemDetailResponseSchema
>;
