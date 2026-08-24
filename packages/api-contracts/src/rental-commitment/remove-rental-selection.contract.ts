import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RemoveRentalSelectionParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  selectionId: z.string().trim().min(1),
});

export const RemoveRentalSelectionBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const RemoveRentalSelectionResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type RemoveRentalSelectionParamsDto = z.infer<
  typeof RemoveRentalSelectionParamsSchema
>;
export type RemoveRentalSelectionBodyDto = z.infer<
  typeof RemoveRentalSelectionBodySchema
>;
export type RemoveRentalSelectionResponseDto = z.infer<
  typeof RemoveRentalSelectionResponseSchema
>;

export const removeRentalSelectionContract = {
  method: "DELETE",
  path: "/rental-commitments/confirmed-rentals/:rentalId/selections/:selectionId",
  params: RemoveRentalSelectionParamsSchema,
  body: RemoveRentalSelectionBodySchema,
  response: RemoveRentalSelectionResponseSchema,
} satisfies ApiContract<
  typeof RemoveRentalSelectionParamsSchema,
  undefined,
  undefined,
  typeof RemoveRentalSelectionBodySchema,
  typeof RemoveRentalSelectionResponseSchema
>;
