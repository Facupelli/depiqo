import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ReplaceRentalDemandLineAccessoriesParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  rentalDemandLineId: z.string().trim().min(1),
});

export const ReplaceRentalDemandLineAccessoriesItemSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
}).strict();

export const ReplaceRentalDemandLineAccessoriesBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  accessories: z.array(ReplaceRentalDemandLineAccessoriesItemSchema),
}).strict();

export const ReplaceRentalDemandLineAccessoriesResponseSchema = z.void();

export type ReplaceRentalDemandLineAccessoriesParamsDto = z.infer<typeof ReplaceRentalDemandLineAccessoriesParamsSchema>;
export type ReplaceRentalDemandLineAccessoriesBodyDto = z.infer<typeof ReplaceRentalDemandLineAccessoriesBodySchema>;
export type ReplaceRentalDemandLineAccessoriesResponseDto = z.infer<typeof ReplaceRentalDemandLineAccessoriesResponseSchema>;

export const replaceRentalDemandLineAccessoriesContract = {
  method: "PUT",
  path: "/rental-commitments/rentals/:rentalId/demand-lines/:rentalDemandLineId/accessories",
  params: ReplaceRentalDemandLineAccessoriesParamsSchema,
  body: ReplaceRentalDemandLineAccessoriesBodySchema,
  response: ReplaceRentalDemandLineAccessoriesResponseSchema,
} satisfies ApiContract<
  typeof ReplaceRentalDemandLineAccessoriesParamsSchema,
  undefined,
  undefined,
  typeof ReplaceRentalDemandLineAccessoriesBodySchema,
  typeof ReplaceRentalDemandLineAccessoriesResponseSchema
>;
