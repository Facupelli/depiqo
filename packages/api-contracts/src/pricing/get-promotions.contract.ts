import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";
import { CreatePromotionExclusionSchema, CreatePromotionScopeSchema } from "./create-promotion.contract";

const OptionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}, z.boolean().optional());

export const GetPromotionsQuerySchema = z.object({
  isActive: OptionalBooleanQuerySchema,
  activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]).optional(),
  effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]).optional(),
  target: z.enum(["ORDER", "ELIGIBLE_LINES"]).optional(),
  search: z.string().trim().min(1).optional(),
});

export const GetPromotionsPromotionSchema = z.object({
  id: z.string(),
  name: z.string(),
  activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]),
  priority: z.number().int(),
  stackable: z.boolean(),
  isActive: z.boolean(),
  validFrom: LocalDateSchema.nullable(),
  validUntil: LocalDateSchema.nullable(),
  effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]),
  effectValue: z.string(),
  target: z.enum(["ORDER", "ELIGIBLE_LINES"]),
  minOrderSubtotal: z.string().nullable(),
  minRentalUnits: z.number().int().nullable(),
  maxRentalUnits: z.number().int().nullable(),
  scopes: z.array(CreatePromotionScopeSchema),
  exclusions: z.array(CreatePromotionExclusionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetPromotionsResponseSchema = z.array(GetPromotionsPromotionSchema);

export type GetPromotionsQueryDto = z.infer<typeof GetPromotionsQuerySchema>;
export type GetPromotionsPromotionDto = z.infer<typeof GetPromotionsPromotionSchema>;
export type GetPromotionsResponseDto = z.infer<typeof GetPromotionsResponseSchema>;

export const getPromotionsContract = {
  method: "GET",
  path: "/pricing/promotions",
  query: GetPromotionsQuerySchema,
  response: GetPromotionsResponseSchema,
} satisfies ApiContract<undefined, typeof GetPromotionsQuerySchema, undefined, undefined, typeof GetPromotionsResponseSchema>;
