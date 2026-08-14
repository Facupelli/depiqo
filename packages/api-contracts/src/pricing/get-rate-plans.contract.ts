import { z } from "zod";

import type { ApiContract } from "../api-contract";

const OptionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}, z.boolean().optional());

export const GetRatePlansQuerySchema = z.object({
  isActive: OptionalBooleanQuerySchema,
});

export const GetRatePlansRatePlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
  currency: z.string(),
  isActive: z.boolean(),
  tierCount: z.number().int().nonnegative(),
});

export const GetRatePlansResponseSchema = z.array(GetRatePlansRatePlanSchema);

export type GetRatePlansQueryDto = z.infer<typeof GetRatePlansQuerySchema>;
export type GetRatePlansRatePlanDto = z.infer<typeof GetRatePlansRatePlanSchema>;
export type GetRatePlansResponseDto = z.infer<typeof GetRatePlansResponseSchema>;

export const getRatePlansContract = {
  method: "GET",
  path: "/pricing/rate-plans",
  query: GetRatePlansQuerySchema,
  response: GetRatePlansResponseSchema,
} satisfies ApiContract<undefined, typeof GetRatePlansQuerySchema, undefined, undefined, typeof GetRatePlansResponseSchema>;
