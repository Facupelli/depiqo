import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateRatePlanBodySchema } from "./create-rate-plan.contract";

export const CreatePricingForRentalOfferBodySchema = z.object({
  catalogRentalOfferId: z.string().trim().min(1),
  ratePlan: CreateRatePlanBodySchema.omit({ isActive: true }),
});

export const CreatePricingForRentalOfferResponseSchema = z.object({
  catalogRentalOfferId: z.string(),
  ratePlanId: z.string(),
  rentalOfferPricingId: z.string(),
});

export type CreatePricingForRentalOfferBodyDto = z.infer<typeof CreatePricingForRentalOfferBodySchema>;
export type CreatePricingForRentalOfferResponseDto = z.infer<typeof CreatePricingForRentalOfferResponseSchema>;

export const createPricingForRentalOfferContract = {
  method: "POST",
  path: "/pricing/rental-offer-pricings",
  body: CreatePricingForRentalOfferBodySchema,
  response: CreatePricingForRentalOfferResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreatePricingForRentalOfferBodySchema,
  typeof CreatePricingForRentalOfferResponseSchema
>;
