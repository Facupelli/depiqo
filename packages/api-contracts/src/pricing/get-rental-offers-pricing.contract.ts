import { z } from "zod";

import type { ApiContract } from "../api-contract";

const RentalOfferIdsQueryParamSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      return [value];
    }

    return value;
  },
  z.array(z.string()).min(1),
);

export const GetRentalOffersPricingQuerySchema = z.object({
  rentalOfferIds: RentalOfferIdsQueryParamSchema,
});

export const GetRentalOffersPricingTierSchema = z.object({
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable(),
  pricePerUnit: z.string(),
});

export const GetRentalOffersPricingRatePlanSchema = z.object({
  id: z.string(),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  currency: z.string(),
  tiers: z.array(GetRentalOffersPricingTierSchema),
});

export const GetRentalOffersPricingItemSchema = z.object({
  id: z.string(),
  catalogRentalOfferId: z.string(),
  ratePlan: GetRentalOffersPricingRatePlanSchema,
});

export const GetRentalOffersPricingResponseSchema = z.object({
  data: z.array(GetRentalOffersPricingItemSchema),
});

export type GetRentalOffersPricingQueryDto = z.infer<typeof GetRentalOffersPricingQuerySchema>;
export type GetRentalOffersPricingTierDto = z.infer<typeof GetRentalOffersPricingTierSchema>;
export type GetRentalOffersPricingRatePlanDto = z.infer<typeof GetRentalOffersPricingRatePlanSchema>;
export type GetRentalOffersPricingItemDto = z.infer<typeof GetRentalOffersPricingItemSchema>;
export type GetRentalOffersPricingResponseDto = z.infer<typeof GetRentalOffersPricingResponseSchema>;

export const getRentalOffersPricingContract = {
  method: "GET",
  path: "/v2/pricing/rental-offer-pricings",
  query: GetRentalOffersPricingQuerySchema,
  response: GetRentalOffersPricingResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalOffersPricingQuerySchema,
  undefined,
  undefined,
  typeof GetRentalOffersPricingResponseSchema
>;
