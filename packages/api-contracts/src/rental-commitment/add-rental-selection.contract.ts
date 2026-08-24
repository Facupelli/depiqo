import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const AddRentalSelectionParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const AddRentalSelectionBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  rentalOfferId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const AddRentalSelectionResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type AddRentalSelectionParamsDto = z.infer<typeof AddRentalSelectionParamsSchema>;
export type AddRentalSelectionBodyDto = z.infer<typeof AddRentalSelectionBodySchema>;
export type AddRentalSelectionResponseDto = z.infer<typeof AddRentalSelectionResponseSchema>;

export const addRentalSelectionContract = {
  method: "POST",
  path: "/rental-commitments/confirmed-rentals/:rentalId/selections",
  params: AddRentalSelectionParamsSchema,
  body: AddRentalSelectionBodySchema,
  response: AddRentalSelectionResponseSchema,
} satisfies ApiContract<
  typeof AddRentalSelectionParamsSchema,
  undefined,
  undefined,
  typeof AddRentalSelectionBodySchema,
  typeof AddRentalSelectionResponseSchema
>;
