import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateRatePlanBodySchema } from "../pricing/create-rate-plan.contract";

export const CreateRentalOfferWithPricingBodySchema = z.object({
  rentableItemId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
  pricing: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("CREATE_RATE_PLAN"),
      ratePlan: CreateRatePlanBodySchema.omit({ isActive: true }),
    }),
    z.object({
      mode: z.literal("REUSE_RATE_PLAN"),
      ratePlanId: z.string().trim().min(1),
    }),
  ]),
});

export const CreateRentalOfferWithPricingResponseSchema = z.object({
  rentalOfferId: z.string(),
  ratePlanId: z.string(),
  rentalOfferPricingId: z.string(),
});

export type CreateRentalOfferWithPricingBodyDto = z.infer<typeof CreateRentalOfferWithPricingBodySchema>;
export type CreateRentalOfferWithPricingResponseDto = z.infer<typeof CreateRentalOfferWithPricingResponseSchema>;

export const createRentalOfferWithPricingContract = {
  method: "POST",
  path: "/offering-setup/rental-offers",
  body: CreateRentalOfferWithPricingBodySchema,
  response: CreateRentalOfferWithPricingResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateRentalOfferWithPricingBodySchema,
  typeof CreateRentalOfferWithPricingResponseSchema
>;
