import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { GetPromotionsPromotionSchema } from "./get-promotions.contract";

export const GetPromotionDetailParamsSchema = z.object({
  promotionId: z.string().uuid(),
});

export const GetPromotionDetailResponseSchema = GetPromotionsPromotionSchema;

export type GetPromotionDetailParamsDto = z.infer<typeof GetPromotionDetailParamsSchema>;
export type GetPromotionDetailResponseDto = z.infer<typeof GetPromotionDetailResponseSchema>;

export const getPromotionDetailContract = {
  method: "GET",
  path: "/v2/pricing/promotions/:promotionId",
  params: GetPromotionDetailParamsSchema,
  response: GetPromotionDetailResponseSchema,
} satisfies ApiContract<typeof GetPromotionDetailParamsSchema, undefined, undefined, undefined, typeof GetPromotionDetailResponseSchema>;
