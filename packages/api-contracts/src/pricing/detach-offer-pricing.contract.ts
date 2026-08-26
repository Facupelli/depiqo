import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const DetachOfferPricingParamsSchema = z.object({
  rentalOfferPricingId: z.string().trim().min(1),
});

export const DetachOfferPricingResponseSchema = z.void();

export type DetachOfferPricingParamsDto = z.infer<typeof DetachOfferPricingParamsSchema>;
export type DetachOfferPricingResponseDto = z.infer<typeof DetachOfferPricingResponseSchema>;

export const detachOfferPricingContract = {
  method: "DELETE",
  path: "/pricing/rental-offer-pricings/:rentalOfferPricingId",
  params: DetachOfferPricingParamsSchema,
  response: DetachOfferPricingResponseSchema,
} satisfies ApiContract<
  typeof DetachOfferPricingParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof DetachOfferPricingResponseSchema
>;
