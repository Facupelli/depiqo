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
  isActive: z.boolean().nullable(),
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
export type GetRentableItemDetailOfferDto = z.infer<typeof GetRentableItemDetailOfferSchema>;
export type GetRentableItemDetailResponseDto = z.infer<typeof GetRentableItemDetailResponseSchema>;

export const getRentableItemDetailContract = {
  method: "GET",
  path: "/v2/catalog/rentable-items/:rentableItemId",
  params: GetRentableItemDetailParamsSchema,
  response: GetRentableItemDetailResponseSchema,
} satisfies ApiContract<
  typeof GetRentableItemDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetRentableItemDetailResponseSchema
>;
