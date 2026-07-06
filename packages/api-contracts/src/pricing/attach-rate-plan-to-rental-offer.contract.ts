import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const AttachRatePlanToRentalOfferBodySchema = z.object({
  catalogRentalOfferId: z.string().trim().min(1),
  ratePlanId: z.string().trim().min(1),
});

export const AttachRatePlanToRentalOfferResponseSchema = z.object({
  rentalOfferPricingId: z.string(),
});

export type AttachRatePlanToRentalOfferBodyDto = z.infer<typeof AttachRatePlanToRentalOfferBodySchema>;
export type AttachRatePlanToRentalOfferResponseDto = z.infer<typeof AttachRatePlanToRentalOfferResponseSchema>;

export const attachRatePlanToRentalOfferContract = {
  method: "PUT",
  path: "/pricing/rental-offer-pricings",
  body: AttachRatePlanToRentalOfferBodySchema,
  response: AttachRatePlanToRentalOfferResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof AttachRatePlanToRentalOfferBodySchema,
  typeof AttachRatePlanToRentalOfferResponseSchema
>;
