import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { GetRatePlansRatePlanSchema } from "./get-rate-plans.contract";

export const GetRatePlanDetailParamsSchema = z.object({
  ratePlanId: z.string().uuid(),
});

export const GetRatePlanDetailTierSchema = z.object({
  id: z.string(),
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable(),
  pricePerUnit: z.string(),
});

export const GetRatePlanDetailRentalOfferSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  rentableItemId: z.string(),
  rentableItemName: z.string(),
  isVisible: z.boolean(),
  isRentable: z.boolean(),
});

export const GetRatePlanDetailAssignmentSchema = z.object({
  rentalOfferPricingId: z.string(),
  isActive: z.boolean(),
  rentalOffer: GetRatePlanDetailRentalOfferSchema.nullable(),
});

export const GetRatePlanDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  billingUnit: GetRatePlansRatePlanSchema.shape.billingUnit,
  currency: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tiers: z.array(GetRatePlanDetailTierSchema),
  assignments: z.array(GetRatePlanDetailAssignmentSchema),
  assignmentCount: z.number().int().nonnegative(),
  activeAssignmentCount: z.number().int().nonnegative(),
});

export type GetRatePlanDetailParamsDto = z.infer<typeof GetRatePlanDetailParamsSchema>;
export type GetRatePlanDetailResponseDto = z.infer<typeof GetRatePlanDetailResponseSchema>;

export const getRatePlanDetailContract = {
  method: "GET",
  path: "/pricing/rate-plans/:ratePlanId",
  params: GetRatePlanDetailParamsSchema,
  response: GetRatePlanDetailResponseSchema,
} satisfies ApiContract<
  typeof GetRatePlanDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetRatePlanDetailResponseSchema
>;
