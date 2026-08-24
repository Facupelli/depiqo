import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ChangeRentalSelectionQuantityParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  selectionId: z.string().trim().min(1),
});

export const ChangeRentalSelectionQuantityBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  releaseAssetIds: z.array(z.string().trim().min(1)).optional(),
}).superRefine(({ releaseAssetIds }, ctx) => {
  if (releaseAssetIds && new Set(releaseAssetIds).size !== releaseAssetIds.length) {
    ctx.addIssue({ code: "custom", path: ["releaseAssetIds"], message: "Release asset IDs must be unique" });
  }
});

export const ChangeRentalSelectionQuantityResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ChangeRentalSelectionQuantityParamsDto = z.infer<typeof ChangeRentalSelectionQuantityParamsSchema>;
export type ChangeRentalSelectionQuantityBodyDto = z.infer<typeof ChangeRentalSelectionQuantityBodySchema>;
export type ChangeRentalSelectionQuantityResponseDto = z.infer<typeof ChangeRentalSelectionQuantityResponseSchema>;

export const changeRentalSelectionQuantityContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/selections/:selectionId/quantity",
  params: ChangeRentalSelectionQuantityParamsSchema,
  body: ChangeRentalSelectionQuantityBodySchema,
  response: ChangeRentalSelectionQuantityResponseSchema,
} satisfies ApiContract<
  typeof ChangeRentalSelectionQuantityParamsSchema,
  undefined,
  undefined,
  typeof ChangeRentalSelectionQuantityBodySchema,
  typeof ChangeRentalSelectionQuantityResponseSchema
>;
