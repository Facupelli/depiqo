import { z } from "zod";

import type { ApiContract } from "../api-contract";

const PositiveDecimalSchema = z
  .union([z.string().trim().regex(/^\d+(?:\.\d+)?$/), z.number().positive()])
  .transform((value) => String(value));

export const CreatePromotionScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL") }),
  z.object({ type: z.literal("RENTABLE_ITEM"), rentableItemId: z.string().uuid() }),
  z.object({ type: z.literal("RENTAL_OFFER"), rentalOfferId: z.string().uuid() }),
  z.object({ type: z.literal("CATEGORY"), categoryId: z.string().uuid() }),
]);

export const CreatePromotionExclusionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RENTABLE_ITEM"), rentableItemId: z.string().uuid() }),
  z.object({ type: z.literal("RENTAL_OFFER"), rentalOfferId: z.string().uuid() }),
  z.object({ type: z.literal("CATEGORY"), categoryId: z.string().uuid() }),
]);

export const CreatePromotionBodySchema = z.object({
  name: z.string().trim().min(1),
  activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]),
  priority: z.number().int().min(0).default(0),
  stackable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]),
  effectValue: PositiveDecimalSchema,
  target: z.enum(["ORDER", "ELIGIBLE_LINES"]).default("ORDER"),
  minOrderSubtotal: PositiveDecimalSchema.optional(),
  minRentalUnits: z.number().int().positive().optional(),
  maxRentalUnits: z.number().int().positive().optional(),
  scopes: z.array(CreatePromotionScopeSchema).min(1),
  exclusions: z.array(CreatePromotionExclusionSchema).default([]),
});

export const CreatePromotionResponseSchema = z.object({
  id: z.string(),
});

export type CreatePromotionScopeDto = z.infer<typeof CreatePromotionScopeSchema>;
export type CreatePromotionExclusionDto = z.infer<typeof CreatePromotionExclusionSchema>;
export type CreatePromotionBodyDto = z.infer<typeof CreatePromotionBodySchema>;
export type CreatePromotionResponseDto = z.infer<typeof CreatePromotionResponseSchema>;

export const createPromotionContract = {
  method: "POST",
  path: "/v2/pricing/promotions",
  body: CreatePromotionBodySchema,
  response: CreatePromotionResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreatePromotionBodySchema, typeof CreatePromotionResponseSchema>;
