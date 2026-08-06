import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateRatePlanTierBodySchema } from "./create-rate-plan.contract";

export const CorrectRatePlanParamsSchema = z.object({
  ratePlanId: z.string().uuid(),
});

export const CorrectRatePlanBodySchema = z.object({
  name: z.string().trim().min(1),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  tiers: z.array(CreateRatePlanTierBodySchema).min(1),
  expectedAffectedRentalOfferIds: z.array(z.string().uuid()).refine((ids) => new Set(ids).size === ids.length, {
    message: "Affected rental offer IDs must be unique.",
  }),
});

export const CorrectRatePlanResponseSchema = z.object({
  id: z.string().uuid(),
  affectedRentalOfferIds: z.array(z.string().uuid()),
});

export type CorrectRatePlanParamsDto = z.infer<typeof CorrectRatePlanParamsSchema>;
export type CorrectRatePlanBodyDto = z.infer<typeof CorrectRatePlanBodySchema>;
export type CorrectRatePlanResponseDto = z.infer<typeof CorrectRatePlanResponseSchema>;

export const correctRatePlanContract = {
  method: "PUT",
  path: "/pricing/rate-plans/:ratePlanId",
  params: CorrectRatePlanParamsSchema,
  body: CorrectRatePlanBodySchema,
  response: CorrectRatePlanResponseSchema,
} satisfies ApiContract<
  typeof CorrectRatePlanParamsSchema,
  undefined,
  undefined,
  typeof CorrectRatePlanBodySchema,
  typeof CorrectRatePlanResponseSchema
>;
