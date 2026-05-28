import { z } from "zod";

import type { ApiContract } from "../api-contract";

const PositiveDecimalSchema = z
  .union([z.string().trim().regex(/^\d+(?:\.\d+)?$/), z.number().positive()])
  .transform((value) => String(value));

export const CreateRatePlanTierBodySchema = z.object({
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable().optional(),
  pricePerUnit: PositiveDecimalSchema,
});

export const CreateRatePlanBodySchema = z.object({
  name: z.string().trim().min(1),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  isActive: z.boolean().default(true),
  tiers: z.array(CreateRatePlanTierBodySchema).min(1),
});

export const CreateRatePlanResponseSchema = z.object({
  id: z.string(),
});

export type CreateRatePlanBodyDto = z.infer<typeof CreateRatePlanBodySchema>;
export type CreateRatePlanResponseDto = z.infer<typeof CreateRatePlanResponseSchema>;

export const createRatePlanContract = {
  method: "POST",
  path: "/v2/pricing/rate-plans",
  body: CreateRatePlanBodySchema,
  response: CreateRatePlanResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreateRatePlanBodySchema, typeof CreateRatePlanResponseSchema>;
