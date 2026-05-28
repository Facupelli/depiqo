import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  CreatePromotionBodySchema,
  CreatePromotionExclusionSchema,
  CreatePromotionResponseSchema,
  CreatePromotionScopeSchema,
} from "./create-promotion.contract";

export const UpdatePromotionParamsSchema = z.object({
  promotionId: z.string().uuid(),
});

export const UpdatePromotionScopeSchema = CreatePromotionScopeSchema;
export const UpdatePromotionExclusionSchema = CreatePromotionExclusionSchema;
export const UpdatePromotionBodySchema = CreatePromotionBodySchema;
export const UpdatePromotionResponseSchema = CreatePromotionResponseSchema;

export type UpdatePromotionParamsDto = z.infer<typeof UpdatePromotionParamsSchema>;
export type UpdatePromotionScopeDto = z.infer<typeof UpdatePromotionScopeSchema>;
export type UpdatePromotionExclusionDto = z.infer<typeof UpdatePromotionExclusionSchema>;
export type UpdatePromotionBodyDto = z.infer<typeof UpdatePromotionBodySchema>;
export type UpdatePromotionResponseDto = z.infer<typeof UpdatePromotionResponseSchema>;

export const updatePromotionContract = {
  method: "PUT",
  path: "/v2/pricing/promotions/:promotionId",
  params: UpdatePromotionParamsSchema,
  body: UpdatePromotionBodySchema,
  response: UpdatePromotionResponseSchema,
} satisfies ApiContract<typeof UpdatePromotionParamsSchema, undefined, undefined, typeof UpdatePromotionBodySchema, typeof UpdatePromotionResponseSchema>;
