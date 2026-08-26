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

export const GetStorefrontRentalOffersPricingQuerySchema = z.object({
  rentalOfferIds: RentalOfferIdsQueryParamSchema,
});

export const GetStorefrontRentalOffersPricingTierSchema = z.object({
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable(),
  pricePerUnit: z.string(),
});

export const GetStorefrontRentalOffersPricingRatePlanSchema = z.object({
  id: z.string(),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  currency: z.string(),
  tiers: z.array(GetStorefrontRentalOffersPricingTierSchema),
});

export const GetStorefrontRentalOffersPricingItemSchema = z.object({
  id: z.string(),
  catalogRentalOfferId: z.string(),
  ratePlan: GetStorefrontRentalOffersPricingRatePlanSchema,
});

export const GetStorefrontRentalOffersPricingResponseSchema = z.object({
  data: z.array(GetStorefrontRentalOffersPricingItemSchema),
});

export type GetStorefrontRentalOffersPricingQueryDto = z.infer<
  typeof GetStorefrontRentalOffersPricingQuerySchema
>;
export type GetStorefrontRentalOffersPricingTierDto = z.infer<
  typeof GetStorefrontRentalOffersPricingTierSchema
>;
export type GetStorefrontRentalOffersPricingRatePlanDto = z.infer<
  typeof GetStorefrontRentalOffersPricingRatePlanSchema
>;
export type GetStorefrontRentalOffersPricingItemDto = z.infer<
  typeof GetStorefrontRentalOffersPricingItemSchema
>;
export type GetStorefrontRentalOffersPricingResponseDto = z.infer<
  typeof GetStorefrontRentalOffersPricingResponseSchema
>;

export const getStorefrontRentalOffersPricingContract = {
  method: "GET",
  path: "/storefront/pricing/rental-offer-pricings",
  query: GetStorefrontRentalOffersPricingQuerySchema,
  response: GetStorefrontRentalOffersPricingResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetStorefrontRentalOffersPricingQuerySchema,
  undefined,
  undefined,
  typeof GetStorefrontRentalOffersPricingResponseSchema
>;
