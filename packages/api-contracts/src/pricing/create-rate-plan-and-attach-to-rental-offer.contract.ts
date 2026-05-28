import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateRatePlanBodySchema } from "./create-rate-plan.contract";

export const CreateRatePlanAndAttachToRentalOfferBodySchema = CreateRatePlanBodySchema.omit({ isActive: true }).extend({
  catalogRentalOfferId: z.string().trim().min(1),
});

export const CreateRatePlanAndAttachToRentalOfferResponseSchema = z.object({
  ratePlanId: z.string(),
  rentalOfferPricingId: z.string(),
});

export type CreateRatePlanAndAttachToRentalOfferBodyDto = z.infer<
  typeof CreateRatePlanAndAttachToRentalOfferBodySchema
>;
export type CreateRatePlanAndAttachToRentalOfferResponseDto = z.infer<
  typeof CreateRatePlanAndAttachToRentalOfferResponseSchema
>;

export const createRatePlanAndAttachToRentalOfferContract = {
  method: "POST",
  path: "/v2/pricing/rental-offer-pricings/create-rate-plan",
  body: CreateRatePlanAndAttachToRentalOfferBodySchema,
  response: CreateRatePlanAndAttachToRentalOfferResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateRatePlanAndAttachToRentalOfferBodySchema,
  typeof CreateRatePlanAndAttachToRentalOfferResponseSchema
>;
